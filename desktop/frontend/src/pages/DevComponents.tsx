import React, { useState } from 'react';
import {
  GlassPanel,
  Button,
  SegmentedControl,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Toast,
  Modal,
  Skeleton,
  EmptyState,
  Tooltip,
} from '../components/ui';
import {
  Sparkles,
  Search,
  Mail,
  Camera,
  FolderOpen,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';

export const DevComponents: React.FC = () => {
  const [segmentVal, setSegmentVal] = useState<'original' | 'boxes' | 'mask'>('original');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputVal, setInputVal] = useState('Deck Pier 4B');
  const [searchVal, setSearchVal] = useState('');
  const [emailVal, setEmailVal] = useState('inspector@highway.gov');
  const [activeToast, setActiveToast] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; message: string } | null>(null);

  const triggerToast = (type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    setActiveToast({ type, message });
  };

  return (
    <div className="space-y-10 pb-16 animate-fade-rise">
      {/* Toast Feedback */}
      {activeToast && (
        <div className="fixed top-6 right-6 z-50">
          <Toast
            type={activeToast.type}
            title="Interaction Triggered"
            message={activeToast.message}
            onClose={() => setActiveToast(null)}
            durationMs={2500}
          />
        </div>
      )}

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
          Design System &amp; Interactive Components
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
          Refined Navy, Cream &amp; Coral design tokens for CrackSense AI. Every control below is active and clickable.
        </p>
      </div>

      {/* 1. Glass Surfaces */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[11px]" style={{ color: 'var(--text-3)' }}>
          1. Glass Surfaces (Navy Translucent)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassPanel variant="base" className="p-6">
            <span className="text-[11px] font-mono uppercase" style={{ color: 'var(--accent)' }}>
              Level 1: Base
            </span>
            <h3 className="text-sm font-semibold mt-1" style={{ color: 'var(--text-1)' }}>
              Panels &amp; Navigators
            </h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-2)' }}>
              Used for floating cards, sidebar, and primary canvas panels.
            </p>
          </GlassPanel>

          <GlassPanel variant="raised" className="p-6">
            <span className="text-[11px] font-mono uppercase" style={{ color: 'var(--accent)' }}>
              Level 2: Raised
            </span>
            <h3 className="text-sm font-semibold mt-1" style={{ color: 'var(--text-1)' }}>
              Modals &amp; Popovers
            </h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-2)' }}>
              Elevated overlays, alerts, contextual dialogs with deeper shadow.
            </p>
          </GlassPanel>

          <GlassPanel variant="sunken" className="p-6">
            <span className="text-[11px] font-mono uppercase" style={{ color: 'var(--accent)' }}>
              Level 3: Sunken
            </span>
            <h3 className="text-sm font-semibold mt-1" style={{ color: 'var(--text-1)' }}>
              Inputs &amp; Containers
            </h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-2)' }}>
              Recessed background for fields, tables, and drop targets.
            </p>
          </GlassPanel>
        </div>
      </section>

      {/* 2. Buttons */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[11px]" style={{ color: 'var(--text-3)' }}>
          2. Buttons &amp; States (Click to Test)
        </h2>
        <GlassPanel variant="base" className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              icon={Sparkles}
              onClick={() => triggerToast('success', 'Primary Coral button clicked')}
            >
              Primary Button
            </Button>
            <Button
              variant="secondary"
              icon={FolderOpen}
              onClick={() => triggerToast('info', 'Secondary Glass button clicked')}
            >
              Secondary Glass
            </Button>
            <Button
              variant="ghost"
              icon={Layers}
              onClick={() => triggerToast('info', 'Ghost button clicked')}
            >
              Ghost Button
            </Button>
            <Button variant="primary" loading>
              Loading State
            </Button>
            <Button variant="secondary" disabled>
              Disabled
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t" style={{ borderColor: 'var(--glass-sunken-border)' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => triggerToast('success', 'Small 32px button clicked')}
            >
              Small (32px)
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => triggerToast('success', 'Medium 40px button clicked')}
            >
              Medium (40px)
            </Button>
            <Button
              variant="primary"
              size="lg"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => triggerToast('success', 'Large 44px button clicked')}
            >
              Large (44px)
            </Button>
          </div>
        </GlassPanel>
      </section>

      {/* 3. Segmented Control */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[11px]" style={{ color: 'var(--text-3)' }}>
          3. Segmented Control with Sliding Pill
        </h2>
        <GlassPanel variant="base" className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
              Image Viewer Mode
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-2)' }}>
              Active selection: <span className="font-mono font-semibold" style={{ color: 'var(--accent)' }}>{segmentVal}</span>
            </p>
          </div>
          <SegmentedControl
            value={segmentVal}
            onChange={(val) => {
              setSegmentVal(val as any);
              triggerToast('info', `Switched mode to ${val}`);
            }}
            options={[
              { id: 'original', label: 'Original' },
              { id: 'boxes', label: 'Boxes' },
              { id: 'mask', label: 'Segmentation Mask' },
            ]}
          />
        </GlassPanel>
      </section>

      {/* 4. Inputs */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[11px]" style={{ color: 'var(--text-3)' }}>
          4. Inputs &amp; Controls (Editable)
        </h2>
        <GlassPanel variant="base" className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Standard Field"
              placeholder="e.g. Concrete Span 4B"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              hint="Enter structural identifier"
            />
            <Input
              label="Search Query"
              leftIcon={Search}
              placeholder="Search past scans..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
            <Input
              label="Inspector Email"
              leftIcon={Mail}
              value={emailVal}
              onChange={(e) => setEmailVal(e.target.value)}
              hint="Verified structural agency email"
            />
          </div>
        </GlassPanel>
      </section>

      {/* 5. Table */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[11px]" style={{ color: 'var(--text-3)' }}>
          5. Data Table
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Inspection ID</TableHead>
              <TableHead>Surface Scan</TableHead>
              <TableHead>Verdict</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono text-xs" style={{ color: 'var(--accent)' }}>
                CS-2026-081
              </TableCell>
              <TableCell style={{ color: 'var(--text-1)' }}>Deck Slab Joint 12</TableCell>
              <TableCell>
                <span
                  className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{
                    background: 'var(--crack-tint)',
                    color: 'var(--crack)',
                    border: '1px solid rgba(255, 111, 97, 0.35)',
                  }}
                >
                  Crack detected
                </span>
              </TableCell>
              <TableCell className="font-mono">98.4%</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => triggerToast('info', 'Viewing CS-2026-081')}>
                  View
                </Button>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs" style={{ color: 'var(--accent)' }}>
                CS-2026-080
              </TableCell>
              <TableCell style={{ color: 'var(--text-1)' }}>Abutment Wall North</TableCell>
              <TableCell>
                <span
                  className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{
                    background: 'var(--success-tint)',
                    color: 'var(--success)',
                    border: '1px solid rgba(78, 186, 134, 0.35)',
                  }}
                >
                  Clear surface
                </span>
              </TableCell>
              <TableCell className="font-mono">99.1%</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => triggerToast('info', 'Viewing CS-2026-080')}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      {/* 6. Modal & Tooltips */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[11px]" style={{ color: 'var(--text-3)' }}>
          6. Modal Dialog &amp; Tooltips
        </h2>
        <GlassPanel variant="base" className="p-6 flex flex-wrap items-center gap-4">
          <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
            Open Sample Modal
          </Button>

          <Tooltip content="Navy, Cream & Coral palette">
            <Button variant="ghost" icon={Shield}>
              Hover for Tooltip
            </Button>
          </Tooltip>

          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Inspection Export"
            description="Generate a PDF inspection summary report with bounding box diagnostics."
          >
            <div className="space-y-4 pt-2">
              <Input label="Report Title" defaultValue="Bridge Pier Inspection - Nov 2026" />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setIsModalOpen(false);
                    triggerToast('success', 'PDF exported successfully');
                  }}
                >
                  Export PDF
                </Button>
              </div>
            </div>
          </Modal>
        </GlassPanel>
      </section>

      {/* 7. Skeletons & Empty State */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[11px]" style={{ color: 'var(--text-3)' }}>
          7. Skeletons &amp; Empty State
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassPanel variant="base" className="p-6 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>
              Loading Shimmer Placeholders
            </h3>
            <Skeleton height={24} width="60%" />
            <Skeleton height={14} width="90%" />
            <Skeleton height={14} width="75%" />
            <div className="flex items-center gap-3 pt-3">
              <Skeleton circle width={36} height={36} />
              <div className="flex-1 space-y-2">
                <Skeleton height={12} width="50%" />
                <Skeleton height={10} width="30%" />
              </div>
            </div>
          </GlassPanel>

          <EmptyState
            icon={Camera}
            title="No defects recorded"
            description="All surveyed patches within this structure passed the neural segmentation boundary checks."
            actionLabel="Run new analysis"
            onAction={() => triggerToast('info', 'New analysis triggered')}
          />
        </div>
      </section>
    </div>
  );
};
