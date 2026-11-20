"""Speed benchmark for exported ONNX model on CPU (multi-thread and single-thread)."""

import time
import json
from pathlib import Path
import numpy as np
from PIL import Image
import onnxruntime as ort

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ONNX_MODEL_PATH = PROJECT_ROOT / "models" / "onnx" / "best_yolo.onnx"


def benchmark_session(session: ort.InferenceSession, dummy_input: np.ndarray, num_tiles: int = 50, warmup: int = 5) -> float:
    """Run warmup and benchmark loop, returning average milliseconds per tile."""
    # Warmup
    for _ in range(warmup):
        session.run(["output0"], {"images": dummy_input})

    # Benchmark
    start_time = time.perf_counter()
    for _ in range(num_tiles):
        session.run(["output0"], {"images": dummy_input})
    end_time = time.perf_counter()

    total_time_sec = end_time - start_time
    avg_ms = (total_time_sec / num_tiles) * 1000.0
    return avg_ms


def run_benchmark():
    dummy_input = np.random.uniform(0.0, 1.0, size=(1, 3, 512, 512)).astype(np.float32)
    tiles_4k = 80  # 4000x3000 tiled with 512 size and 0.20 overlap = 80 tiles

    # 1. Multi-thread (all available threads)
    opts_all = ort.SessionOptions()
    opts_all.intra_op_num_threads = 0  # all available
    opts_all.inter_op_num_threads = 0
    session_all = ort.InferenceSession(str(ONNX_MODEL_PATH), sess_options=opts_all, providers=["CPUExecutionProvider"])
    avg_ms_all = benchmark_session(session_all, dummy_input, num_tiles=50, warmup=5)
    est_sec_all = (avg_ms_all * tiles_4k) / 1000.0

    # 2. Single-thread
    opts_1 = ort.SessionOptions()
    opts_1.intra_op_num_threads = 1
    opts_1.inter_op_num_threads = 1
    session_1 = ort.InferenceSession(str(ONNX_MODEL_PATH), sess_options=opts_1, providers=["CPUExecutionProvider"])
    avg_ms_1 = benchmark_session(session_1, dummy_input, num_tiles=50, warmup=5)
    est_sec_1 = (avg_ms_1 * tiles_4k) / 1000.0

    print("=" * 60)
    print("        CRACKSENSE ONNX RUNTIME SPEED BENCHMARK        ")
    print("=" * 60)
    print(f"Model: {ONNX_MODEL_PATH.name}")
    print(f"Benchmark: 50 tiles (512x512 float32)")
    print(f"Tiles for 4000x3000 photo (512 tile, 20% overlap): {tiles_4k}")
    print("-" * 60)
    print(f"All Threads CPU:   {avg_ms_all:.2f} ms/tile | Est. 4000x3000: {est_sec_all:.2f} s")
    print(f"1 Thread CPU:      {avg_ms_1:.2f} ms/tile | Est. 4000x3000: {est_sec_1:.2f} s")
    print("GPU / DirectML:    Skipped (providers not installed in current environment)")
    print("=" * 60)

    results = {
        "model": ONNX_MODEL_PATH.name,
        "num_tiles_benchmarked": 50,
        "tiles_4000x3000": tiles_4k,
        "all_threads": {
            "avg_ms_per_tile": round(avg_ms_all, 2),
            "est_4000x3000_sec": round(est_sec_all, 2),
        },
        "single_thread": {
            "avg_ms_per_tile": round(avg_ms_1, 2),
            "est_4000x3000_sec": round(est_sec_1, 2),
        },
        "gpu_directml": "Not available (CPU only)",
    }

    out_file = PROJECT_ROOT / "ai" / "export" / "benchmark_results.json"
    with open(out_file, "w") as f:
        json.dump(results, f, indent=2)

    return results


if __name__ == "__main__":
    run_benchmark()
