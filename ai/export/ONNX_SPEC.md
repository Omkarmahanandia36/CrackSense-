# CrackSense ONNX Model Integration Specification

## 1. Overview
This specification documents the exported ONNX model (`best_yolo.onnx` and `best_yolo_dynamic.onnx`) derived from `models/best_yolo.pt` (DamSegment-trained YOLO model for concrete crack and spalling detection). It provides the exact contract needed for client-side execution via `onnxruntime-web` (WebAssembly and WebGPU backends).

---

## 2. Input Tensor Specification

| Property | Value | Notes |
|---|---|---|
| **Tensor Name** | `images` | Defined in model graph input |
| **Shape (Static)** | `[1, 3, 512, 512]` | Batch=1, Channels=3 (RGB), Height=512, Width=512 |
| **Shape (Dynamic)** | `[batch, 3, height, width]` | Accepts variable tile sizes and batches |
| **Data Type** | `float32` | Standard 32-bit floating point |
| **Color Space** | RGB | Must match training color distribution |

### Preprocessing Pipeline
For each cut tile (e.g., extracted from high-resolution concrete photography):
1. **Resize/Letterbox**: Resize tile to `512 x 512` using bilinear or bicubic interpolation.
2. **Channel Format**: Ensure color ordering is RGB (convert BGR or RGBA).
3. **Normalization**: Divide pixel values by `255.0` (`x / 255.0`), yielding float32 values in range `[0.0, 1.0]`.
4. **Layout Transpose**: Convert image array from HWC (`[512, 512, 3]`) to CHW (`[3, 512, 512]`).
5. **Batch Dimension**: Add batch dimension to produce NCHW tensor (`[1, 3, 512, 512]`).

---

## 3. Output Tensor Specification & Decoding

| Property | Value | Notes |
|---|---|---|
| **Tensor Name** | `output0` | Defined in model graph output |
| **Shape (Static)** | `[1, 6, 5376]` | `[batch, num_features, num_anchors]` |
| **Shape (Dynamic)** | `[batch, 6, anchors]` | Anchors scale dynamically with input resolution |
| **Data Type** | `float32` | Standard 32-bit floating point |

### Output Dimension Breakdown
- **Dimension 0 (`batch`)**: Batch size (1).
- **Dimension 1 (`6 features`)**:
  - `Index 0`: Center X (`cx`) in pixel coordinates relative to the 512x512 tile.
  - `Index 1`: Center Y (`cy`) in pixel coordinates relative to the 512x512 tile.
  - `Index 2`: Box Width (`w`) in pixels.
  - `Index 3`: Box Height (`h`) in pixels.
  - `Index 4`: Confidence score for Class 0 (`crack`) (sigmoid probability `[0.0, 1.0]`).
  - `Index 5`: Confidence score for Class 1 (`spalling`) (sigmoid probability `[0.0, 1.0]`).
- **Dimension 2 (`5376 anchors`)**: Anchor candidates across feature maps (`64x64 + 32x32 + 16x16 = 4096 + 1024 + 256 = 5376`).

### Decoding Algorithm
1. **Transpose**: Transpose `output0[0]` from `(6, 5376)` to `(5376, 6)`.
2. **Confidence Filtering**:
   For each anchor row `row` in `5376`:
   - Extract class scores: `scores = row[4:6]`
   - Find maximum class confidence: `max_score = max(scores)`
   - Find predicted class ID: `cls_id = argmax(scores)`
   - Filter candidate: `if max_score >= 0.35`:
     - `cx = row[0]`, `cy = row[1]`, `w = row[2]`, `h = row[3]`
     - Convert center coordinates to top-left format:
       - `x1 = cx - w / 2.0`
       - `y1 = cy - h / 2.0`
       - `x2 = cx + w / 2.0`
       - `y2 = cy + h / 2.0`
     - Store box `[x1, y1, w, h]` and score for Non-Maximum Suppression.
3. **Non-Maximum Suppression (NMS)**:
   - Run NMS with `score_threshold = 0.35` and `iou_threshold = 0.40` (e.g. via `cv2.dnn.NMSBoxes` or browser WASM equivalent).

---

## 4. Coordinate Mapping (Tile to Full Image)

When tiled inference is executed on large concrete surfaces:
- Each tile coordinate `(tx1, ty1, tx2, ty2)` represents the bounding rectangle in the original image.
- For each box detected inside the tile `[bx1, by1, bx2, by2]`:
  $$\text{global\_x1} = \text{clamp}(tx1 + bx1, 0, \text{image\_width})$$
  $$\text{global\_y1} = \text{clamp}(ty1 + by1, 0, \text{image\_height})$$
  $$\text{global\_x2} = \text{clamp}(tx1 + bx2, 0, \text{image\_width})$$
  $$\text{global\_y2} = \text{clamp}(ty1 + by2, 0, \text{image\_height})$$

---

## 5. ONNX Operators & Web Runtime Compatibility

The model graph consists of 234 nodes using the following 14 ONNX operator types (all opset 12):
1. `Add`
2. `Concat`
3. `Conv`
4. `Div`
5. `MaxPool`
6. `Mul`
7. `Reshape`
8. `Resize`
9. `Sigmoid`
10. `Slice`
11. `Softmax`
12. `Split`
13. `Sub`
14. `Transpose`

### Compatibility Assessment:
- **`onnxruntime-web` (WASM)**: 100% supported. All 14 operators are core primitives available in WebAssembly SIMD/threaded builds.
- **`onnxruntime-web` (WebGPU)**: Fully supported.
- **Excluded Complexity**: Because the model was exported with `nms=False`, non-standard and brittle ONNX NMS operators (which frequently fail in browser runtimes) are completely avoided. Post-processing NMS runs cleanly in standard JavaScript/TypeScript.
