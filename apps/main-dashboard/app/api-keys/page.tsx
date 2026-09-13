'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Lock, Key, Clipboard, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getToken, useUser } from '@clerk/nextjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const statusColors: any = {
  Active: '#00C2A8',
  Revoked: '#6B7280',
};

export default function Page() {
  type FormattedDate = {
    exact: string;
    relative: string | null;
  };

  type KeyRow = {
    id: string;
    prefix: string;
    name: string;
    scope: 'Read Only' | 'Write Only' | 'Full Access';
    created: FormattedDate;
    creaetedRaw?: string | Date | null;
    lastUsed: FormattedDate;
    status: 'Active' | 'Revoked';
  };

  // Remove hardcoded seed; load from API instead
  const [selected, setSelected] = React.useState<KeyRow | null>(null);
  const [revealOpen, setRevealOpen] = React.useState(false);
  const [generatedSecret, setGeneratedSecret] = React.useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const [isCreating, setIsCreating] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const { isLoaded, isSignedIn } = useUser();
  const queryClient = useQueryClient();

  const { data: apiKeysData, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URI}/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await response.json();
      return res;
    },
    enabled: isLoaded && isSignedIn,
  });

  function formatDateTimeComponents(dateStr: string | Date | null | undefined) {
    if (!dateStr) {
      return { exact: 'Never', relative: null };
    }

    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) {
      return { exact: '—', relative: null };
    }

    // Exact date + time (e.g., "Sep 10, 2026, 6:35 PM")
    const exact = d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Relative elapsed time
    const diffMs = Date.now() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let relative = 'just now';
    if (diffDays >= 1) {
      relative = `${diffDays}d ago`;
    } else if (diffHours >= 1) {
      relative = `${diffHours}h ago`;
    } else if (diffMins >= 1) {
      relative = `${diffMins}m ago`;
    }

    return { exact, relative };
  }

  const apiKeys: KeyRow[] = React.useMemo(() => {
    if (!Array.isArray(apiKeysData)) return [];

    return apiKeysData.map((k: any) => {
      const isRevoked = Boolean(k.revoked_at || k.revokedAt);
      const createdAt = k.created_at || k.createdAt;
      const lastUsedAt = k.last_used_at || k.lastUsedAt;

      return {
        id: k.id,
        prefix: k.prefix ?? '—',
        name: k.name ?? (k.prefix ? `${k.prefix}...` : 'Default Key'),
        scope: k.scope ?? 'Full Access',
        created: formatDateTimeComponents(createdAt),
        createdRaw: createdAt,
        lastUsed: formatDateTimeComponents(lastUsedAt),
        status: isRevoked ? 'Revoked' : 'Active',
      };
    });
  }, [apiKeysData]);

  const createKey = async () => {
    setIsCreating(true);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URI}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const { key } = await res.json();
      setGeneratedSecret(key);
      setRevealOpen(true);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    } finally {
      setIsCreating(false);
    }
  };

  const revokeSelected = async () => {
    if (!selected) return;
    setIsRevoking(true);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URI}/api-keys/${selected.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setSelected(null);
    } finally {
      setIsRevoking(false);
    }
  };

  const copyGeneratedSecret = () => {
    if (!generatedSecret) return;
    navigator.clipboard.writeText(generatedSecret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const activeCount = React.useMemo(
    () => apiKeys.filter((k: any) => k.status === 'Active').length,
    [apiKeys]
  );

  const limitReached = activeCount >= 5;

  const revokedCount = React.useMemo(
    () => apiKeys.filter((k: any) => k.status === 'Revoked').length,
    [apiKeys]
  );

  const lastGeneratedAgo = React.useMemo(() => {
    const timestamps = apiKeys
      .map((k: any) => Date.parse(k.createdRaw))
      .filter((t: number) => !Number.isNaN(t));

    if (timestamps.length === 0) return '—';

    const latest = Math.max(...timestamps);
    const diffMs = Date.now() - latest;
    const secs = Math.floor(diffMs / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days >= 1) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours >= 1) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (mins >= 1) return `${mins} min${mins > 1 ? 's' : ''} ago`;
    return 'just now';
  }, [apiKeys]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
          <p className="text-sm text-muted-foreground">
            Manage and secure your project access credentials.
          </p>
        </div>
        {/* Disable generate button at limit; show tooltip */}
        <span className="inline-flex">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="rounded-md"
                onClick={() => createKey()}
                disabled={limitReached || isCreating}
              >
                <Plus className="h-4 w-4" />
                {isCreating ? 'Generating...' : 'Generate New Key'}
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>
              {limitReached ? 'Limit reached: 5 active keys per user' : 'Create a new API key'}
            </TooltipContent>
          </Tooltip>
        </span>
      </div>

      {/* Info Card */}
      <div
        className="rounded-md border"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-start gap-3 p-6">
          <div className="mt-0.5">
            <Lock className="h-5 w-5 opacity-70" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium">API Key Security</h3>
            <p className="text-sm text-muted-foreground">
              Your API keys are sensitive credentials. Treat them like passwords — never share them
              publicly or commit them to version control. Each key is unique per project and can be
              revoked instantly if compromised. You will only see your key once upon creation for
              your security.
            </p>
          </div>
        </div>
      </div>

      {/* Keys Table */}
      <div className="rounded-md border">
        {apiKeys.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2">
            <h3 className="text-sm font-medium">Your API Keys</h3>
            <span className="text-xs text-muted-foreground">{apiKeys?.length} keys</span>
          </div>
        )}

        {apiKeys.length === 0 ? (
          isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading saved API keys…
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Key className="mr-2 h-4 w-4" />
              No API keys created yet. Generate one to start using the OneMinute Logs API.
            </div>
          )
        ) : (
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Refreshing keys…
                </div>
              </div>
            )}

            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys?.map(k => (
                  <TableRow
                    key={`${k.id}`}
                    className="cursor-pointer transition-colors hover:bg-white/5"
                    onClick={() => setSelected(k)}
                  >
                    <TableCell className="text-white/90">{k.prefix}</TableCell>
                    <TableCell>
                      <div className="text-white/80">{k.created.exact}</div>
                      {k.created.relative && (
                        <div className="text-xs text-muted-foreground">{k.created.relative}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-white/80">{k.lastUsed.exact}</div>
                      {k.lastUsed.relative && (
                        <div className="text-xs text-muted-foreground">{k.lastUsed.relative}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium" style={{ color: statusColors[k.status] }}>
                      {k.status}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {k.status !== 'Revoked' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-lg"
                                  disabled={activeCount <= 1 && k.status === 'Active'}
                                  onClick={async e => {
                                    e.stopPropagation();
                                    if (k.name === 'Default') {
                                      toast.error(
                                        'Cannot delete the system-generated Default API key'
                                      );
                                      return;
                                    }
                                    if (activeCount <= 1 && k.status === 'Active') {
                                      toast.error('Cannot revoke the only active API key');
                                      return;
                                    }
                                    setSelected(k);
                                    await revokeSelected();
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Revoke
                                </Button>
                              </span>
                            </TooltipTrigger>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Key Detail Drawer (right side) */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="fixed right-0 top-0 h-full w-105 border-l p-4"
            style={{
              background: '#0E1117',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">API Key Details</h3>
              <div className="flex gap-2">
                {selected.status !== 'Revoked' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-md"
                          disabled={
                            (isRevoking && activeCount <= 1 && selected.status === 'Active') ||
                            selected.name === 'Default'
                          }
                          onClick={revokeSelected}
                        >
                          <Trash2 className="h-4 w-4" />
                          {isRevoking ? 'Revoking...' : 'Revoke'}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      {selected.name === 'Default'
                        ? 'Cannot delete the system-generated Default API key'
                        : activeCount <= 1 && selected.status === 'Active'
                          ? 'Cannot revoke the only active API key'
                          : 'Revoke this API key'}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            <div className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span>{selected.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scope</span>
                <span>{selected.scope}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{selected.created.exact}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Used</span>
                <span>{selected.lastUsed.exact}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span style={{ color: statusColors[selected.status] }}>{selected.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* One-time Secret Reveal Dialog */}
      <Dialog
        open={revealOpen}
        onOpenChange={open => {
          setRevealOpen(open);
          if (!open) setGeneratedSecret(null);
        }}
      >
        <DialogContent
          className="sm:max-w-130"
          overlayClassName="fixed inset-0 z-50 bg-black/30 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out"
        >
          <DialogHeader>
            <DialogTitle>Your New API Key</DialogTitle>
            <DialogDescription>
              You will only see this key once. Copy and store it securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border p-3 text-sm font-mono">
              <div className="text-xs text-muted-foreground mb-1">Secret</div>
              <div className="flex items-start justify-between gap-2">
                <span className="flex-1 min-w-0 break-all">{generatedSecret ?? '—'}</span>
                <Tooltip open={copied}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={
                        'rounded-md ' +
                        (copied
                          ? 'text-emerald-400 border-emerald-400 hover:bg-transparent'
                          : 'hover:bg-muted hover:text-muted-foreground')
                      }
                      onClick={copyGeneratedSecret}
                      disabled={!generatedSecret}
                    >
                      <Clipboard className="h-4 w-4" />
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>Copied!</TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              For security, we cannot show this key again or recover it later.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button className="rounded-md" onClick={() => setRevealOpen(false)}>
                I stored it safely
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer status bar */}
      <div
        className="flex items-center justify-between rounded-md border px-3 py-2 text-xs"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center gap-6">
          <span className="text-muted-foreground">Active Keys</span>
          <span className="font-medium">{activeCount}</span>
          <span className="text-muted-foreground">Revoked</span>
          <span className="font-medium">{revokedCount}</span>
          <span className="text-muted-foreground">Last Generated</span>
          <span className="font-medium">{lastGeneratedAgo}</span>
        </div>
      </div>
    </div>
  );
}
