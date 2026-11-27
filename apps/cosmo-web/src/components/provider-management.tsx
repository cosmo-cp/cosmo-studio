'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import ProviderIcon from '@/components/provider-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner as Loader } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useProviderPageState } from '@/features/providers/use-provider-page-state';
import { cn } from '@/lib/utils';
import { ModelProviderTypeEnum } from 'core/database/schema/modelProviderSchema';
import type { ProviderWithModels } from 'core/dto';
import { ProviderCatalogByType } from 'core/providerCatalog';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    Brain,
    ChevronDown,
    ChevronUp,
    LayoutGrid,
    List,
    MoreVertical,
    Plus,
    Search,
    SquarePen,
    Trash2,
    Wrench,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import React, { useMemo, useState } from 'react';

export const ProviderInfo: Record<ModelProviderTypeEnum, { name: string; description: string }> = Object.values(
    ProviderCatalogByType,
).reduce(
    (acc, entry) => {
        acc[entry.type] = { name: entry.name, description: entry.description };
        return acc;
    },
    {} as Record<ModelProviderTypeEnum, { name: string; description: string }>,
);

function renderBrandLogo(type: ModelProviderTypeEnum, theme?: string) {
    if (type === ModelProviderTypeEnum.GOOGLE) {
        return (
            <div className="size-9 rounded-lg bg-white dark:bg-white/10 border border-border/40 flex items-center justify-center p-1.5 shrink-0 shadow-2xs">
                <svg viewBox="0 0 24 24" className="size-6" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                    />
                    <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                    />
                    <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        fill="#FBBC05"
                    />
                    <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        fill="#EA4335"
                    />
                </svg>
            </div>
        );
    }

    if (type === ModelProviderTypeEnum.OPENAI) {
        return (
            <div className="size-9 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center p-1.5 shrink-0 shadow-2xs">
                <Image
                    src="/providers/openai.svg"
                    alt="OpenAI icon"
                    width={22}
                    height={22}
                    unoptimized
                    className="invert dark:invert-0"
                />
            </div>
        );
    }

    if (type === ModelProviderTypeEnum.ANTHROPIC) {
        return (
            <div className="size-9 rounded-lg bg-[#d97757]/20 border border-[#d97757]/40 text-[#d97757] dark:text-[#f49371] flex items-center justify-center p-1 shrink-0 font-serif font-black text-base shadow-2xs">
                <span>A\</span>
            </div>
        );
    }

    return (
        <div className="size-9 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-center shrink-0">
            <ProviderIcon type={type} theme={theme} size={24} className="mr-0" />
        </div>
    );
}

export function ProviderManagement() {
    const { resolvedTheme } = useTheme();
    const {
        providers,
        isLoadingProviders,
        providersError,
        models,
        isOpen,
        error,
        isLoadingModels,
        isDeleting,
        deleteConfirmation,
        selectedProviderType,
        name,
        apiKey,
        apiUrl,
        editingProvider,
        selectedModels,
        providerSearch,
        filteredProviders,
        isLocalProvider,
        stepper,
        setName,
        setApiKey,
        setApiUrl,
        setProviderSearch,
        handleDialogOpenChange,
        openCreateDialog,
        closeDialog,
        changeProviderType,
        loadModels,
        saveProviderDraft,
        editProvider,
        requestDeleteProvider,
        clearDeleteConfirmation,
        confirmDeleteProvider,
        toggleModel,
    } = useProviderPageState();

    // Local UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
    const [activeTabs, setActiveTabs] = useState<Record<string, 'models' | 'configuration' | 'usage' | 'details'>>({});
    const [enabledStates, setEnabledStates] = useState<Record<string, boolean>>({});
    const [selectedTableModels, setSelectedTableModels] = useState<Record<string, Record<string, boolean>>>({});

    const isProviderExpanded = (providerId: string, index: number) => {
        if (expandedCards[providerId] !== undefined) {
            return expandedCards[providerId];
        }
        // Default expand the first provider to match mockup
        return index === 0;
    };

    const toggleCardExpanded = (providerId: string, index: number) => {
        setExpandedCards((prev) => ({
            ...prev,
            [providerId]: !isProviderExpanded(providerId, index),
        }));
    };

    const isProviderEnabled = React.useCallback(
        (providerId: string) => enabledStates[providerId] !== false,
        [enabledStates],
    );

    const toggleProviderEnabled = (providerId: string) => {
        setEnabledStates((prev) => ({
            ...prev,
            [providerId]: !isProviderEnabled(providerId),
        }));
    };

    const getActiveTab = (providerId: string) => activeTabs[providerId] || 'models';

    const setActiveTab = (providerId: string, tab: 'models' | 'configuration' | 'usage' | 'details') => {
        setActiveTabs((prev) => ({
            ...prev,
            [providerId]: tab,
        }));
    };

    const toggleTableModel = (providerId: string, modelId: string) => {
        setSelectedTableModels((prev) => ({
            ...prev,
            [providerId]: {
                ...prev[providerId],
                [modelId]: !prev[providerId]?.[modelId],
            },
        }));
    };

    const toggleAllModels = (provider: ProviderWithModels) => {
        const currentSelected = selectedTableModels[provider.id] || {};
        const allSelected = (provider.models || []).every((m) => currentSelected[m.modelId]);
        const next: Record<string, boolean> = {};
        for (const m of provider.models || []) {
            next[m.modelId] = !allSelected;
        }
        setSelectedTableModels((prev) => ({
            ...prev,
            [provider.id]: next,
        }));
    };

    // Filter calculations
    const allCount = providers.length;
    const enabledCount = useMemo(
        () => providers.filter((p) => isProviderEnabled(p.id)).length,
        [providers, isProviderEnabled],
    );
    const disabledCount = allCount - enabledCount;

    const filteredList = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return providers.filter((provider) => {
            // Status filter
            const enabled = isProviderEnabled(provider.id);
            if (statusFilter === 'enabled' && !enabled) return false;
            if (statusFilter === 'disabled' && enabled) return false;

            // Search query
            if (!query) return true;
            const matchesName = provider.name.toLowerCase().includes(query);
            const matchesType = provider.type.toLowerCase().includes(query);
            const matchesModel = (provider.models || []).some(
                (m) => m.name.toLowerCase().includes(query) || m.modelId.toLowerCase().includes(query),
            );
            return matchesName || matchesType || matchesModel;
        });
    }, [providers, searchQuery, statusFilter, isProviderEnabled]);

    const capabilityClassName = (isPresent: boolean) => (isPresent ? 'text-green-600' : 'text-red-600');

    const formatModality = (modality: string) =>
        modality.toUpperCase() === 'PDF' ? 'PDF' : modality.charAt(0).toUpperCase() + modality.slice(1);

    const renderCapabilityIcon = ({
        label,
        isPresent,
        icon,
    }: {
        label: string;
        isPresent: boolean;
        icon: React.ReactNode;
    }) => (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label={`${label}: ${isPresent ? 'present' : 'absent'}`}
                    className={`${capabilityClassName(isPresent)} inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
                >
                    {icon}
                </button>
            </TooltipTrigger>
            <TooltipContent>
                <p>{label}</p>
            </TooltipContent>
        </Tooltip>
    );

    if (isLoadingProviders && providers.length === 0) {
        return (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                <Loader className="mr-2 size-4" />
                Loading providers...
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Providers</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage your AI provider configurations and API keys.
                    </p>
                </div>
                <Button
                    onClick={openCreateDialog}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg px-4 py-2 flex items-center gap-1.5 shadow-xs cursor-pointer h-9 w-fit shrink-0"
                >
                    <Plus className="size-4" />
                    Add Provider
                </Button>
            </div>

            {/* Error Alert */}
            {providersError && (
                <div
                    role="alert"
                    className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-600 font-medium"
                >
                    {providersError}
                </div>
            )}

            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search providers or models..."
                        className="pl-9 pr-4 h-9 rounded-lg border-border bg-background text-sm w-full"
                    />
                </div>

                {/* Filter Chips & View Mode Toggle */}
                <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                                statusFilter === 'all'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold'
                                    : 'border border-border text-muted-foreground hover:text-foreground',
                            )}
                        >
                            All ({allCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('enabled')}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                                statusFilter === 'enabled'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold'
                                    : 'border border-border text-muted-foreground hover:text-foreground',
                            )}
                        >
                            Enabled ({enabledCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('disabled')}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                                statusFilter === 'disabled'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold'
                                    : 'border border-border text-muted-foreground hover:text-foreground',
                            )}
                        >
                            Disabled ({disabledCount})
                        </button>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/20">
                        <button
                            type="button"
                            aria-label="Grid view"
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                'p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer',
                                viewMode === 'grid' && 'bg-background text-foreground shadow-2xs',
                            )}
                        >
                            <LayoutGrid className="size-4" />
                        </button>
                        <button
                            type="button"
                            aria-label="List view"
                            onClick={() => setViewMode('list')}
                            className={cn(
                                'p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer',
                                viewMode === 'list' && 'bg-background text-foreground shadow-2xs',
                            )}
                        >
                            <List className="size-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Providers List / Cards */}
            {filteredList.length > 0 ? (
                <div
                    className={cn(
                        'space-y-4',
                        viewMode === 'grid' && 'grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0',
                    )}
                >
                    {filteredList.map((provider, index) => {
                        const expanded = isProviderExpanded(provider.id, index);
                        const enabled = isProviderEnabled(provider.id);
                        const currentTab = getActiveTab(provider.id);
                        const providerModels = provider.models || [];
                        const allModelsSelected =
                            providerModels.length > 0 &&
                            providerModels.every((m) => selectedTableModels[provider.id]?.[m.modelId]);

                        return (
                            <div
                                key={provider.id}
                                className="border border-border/80 rounded-xl bg-card overflow-hidden shadow-2xs transition-all"
                            >
                                {/* Card Header */}
                                <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        {renderBrandLogo(provider.type, resolvedTheme)}
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-base text-foreground truncate">
                                                    {provider.name}
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60">
                                                    <span
                                                        className={cn(
                                                            'size-1.5 rounded-full',
                                                            enabled ? 'bg-emerald-500' : 'bg-muted-foreground',
                                                        )}
                                                    />
                                                    {enabled ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground lowercase mt-0.5">
                                                {provider.type}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons Right */}
                                    <div className="flex items-center gap-2.5 shrink-0">
                                        <Switch
                                            checked={enabled}
                                            onCheckedChange={() => toggleProviderEnabled(provider.id)}
                                            aria-label={`Toggle ${provider.name}`}
                                            className="data-[state=checked]:bg-blue-600"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => editProvider(provider)}
                                            aria-label="Edit provider"
                                            title="Edit provider"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            <SquarePen className="size-4" />
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    aria-label="More provider options"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                                >
                                                    <MoreVertical className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => editProvider(provider)}>
                                                    <SquarePen className="size-4 mr-2" />
                                                    Edit Provider
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => requestDeleteProvider(provider.id)}
                                                    disabled={isDeleting === provider.id}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="size-4 mr-2" />
                                                    Delete Provider
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => toggleCardExpanded(provider.id, index)}
                                            aria-label={expanded ? 'Collapse card' : 'Expand card'}
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            {expanded ? (
                                                <ChevronUp className="size-4" />
                                            ) : (
                                                <ChevronDown className="size-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Expanded Tab Content */}
                                {expanded && (
                                    <div className="border-t border-border/70 px-4 sm:px-5 pt-3 pb-5 space-y-4 bg-muted/10">
                                        {/* Tabs Bar */}
                                        <div className="flex items-center gap-6 border-b border-border/60 text-sm overflow-x-auto">
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab(provider.id, 'models')}
                                                className={cn(
                                                    'pb-2.5 font-medium transition-colors cursor-pointer border-b-2',
                                                    currentTab === 'models'
                                                        ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400 font-semibold'
                                                        : 'text-muted-foreground border-transparent hover:text-foreground',
                                                )}
                                            >
                                                Models ({providerModels.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab(provider.id, 'configuration')}
                                                className={cn(
                                                    'pb-2.5 font-medium transition-colors cursor-pointer border-b-2',
                                                    currentTab === 'configuration'
                                                        ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400 font-semibold'
                                                        : 'text-muted-foreground border-transparent hover:text-foreground',
                                                )}
                                            >
                                                Configuration
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab(provider.id, 'usage')}
                                                className={cn(
                                                    'pb-2.5 font-medium transition-colors cursor-pointer border-b-2',
                                                    currentTab === 'usage'
                                                        ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400 font-semibold'
                                                        : 'text-muted-foreground border-transparent hover:text-foreground',
                                                )}
                                            >
                                                Usage
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab(provider.id, 'details')}
                                                className={cn(
                                                    'pb-2.5 font-medium transition-colors cursor-pointer border-b-2',
                                                    currentTab === 'details'
                                                        ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400 font-semibold'
                                                        : 'text-muted-foreground border-transparent hover:text-foreground',
                                                )}
                                            >
                                                Details
                                            </button>
                                        </div>

                                        {/* Tab: Models */}
                                        {currentTab === 'models' && (
                                            <div className="space-y-3">
                                                {providerModels.length > 0 ? (
                                                    <div className="overflow-x-auto rounded-lg border border-border/60 bg-background">
                                                        <table className="w-full text-left text-sm">
                                                            <thead>
                                                                <tr className="border-b border-border/60 text-xs text-muted-foreground bg-muted/20">
                                                                    <th className="py-2.5 px-3.5 w-10">
                                                                        <Checkbox
                                                                            checked={allModelsSelected}
                                                                            onCheckedChange={() =>
                                                                                toggleAllModels(provider)
                                                                            }
                                                                            aria-label="Select all models"
                                                                        />
                                                                    </th>
                                                                    <th className="py-2.5 px-3.5 font-medium">Model</th>
                                                                    <th className="py-2.5 px-3.5 font-medium">Type</th>
                                                                    <th className="py-2.5 px-3.5 font-medium">
                                                                        Status
                                                                    </th>
                                                                    <th className="py-2.5 px-3.5 w-10 text-right"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border/40">
                                                                {providerModels.map((model) => (
                                                                    <tr
                                                                        key={model.id || model.modelId}
                                                                        className="hover:bg-muted/20 transition-colors"
                                                                    >
                                                                        <td className="py-2.5 px-3.5">
                                                                            <Checkbox
                                                                                checked={Boolean(
                                                                                    selectedTableModels[provider.id]?.[
                                                                                        model.modelId
                                                                                    ],
                                                                                )}
                                                                                onCheckedChange={() =>
                                                                                    toggleTableModel(
                                                                                        provider.id,
                                                                                        model.modelId,
                                                                                    )
                                                                                }
                                                                                aria-label={`Select ${model.name}`}
                                                                            />
                                                                        </td>
                                                                        <td className="py-2.5 px-3.5 font-medium text-foreground">
                                                                            {model.name || model.modelId}
                                                                        </td>
                                                                        <td className="py-2.5 px-3.5">
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200/50 dark:bg-sky-950/60 dark:text-sky-300">
                                                                                Chat
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-2.5 px-3.5">
                                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60">
                                                                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                                                                Enabled
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-2.5 px-3.5 text-right">
                                                                            <DropdownMenu>
                                                                                <DropdownMenuTrigger asChild>
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        size="icon-sm"
                                                                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                                                    >
                                                                                        <MoreVertical className="size-3.5" />
                                                                                    </Button>
                                                                                </DropdownMenuTrigger>
                                                                                <DropdownMenuContent align="end">
                                                                                    <DropdownMenuItem
                                                                                        onClick={() =>
                                                                                            editProvider(provider)
                                                                                        }
                                                                                    >
                                                                                        Configure Model
                                                                                    </DropdownMenuItem>
                                                                                </DropdownMenuContent>
                                                                            </DropdownMenu>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded-lg bg-background">
                                                        No models configured for this provider yet.
                                                    </div>
                                                )}

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => editProvider(provider)}
                                                    className="rounded-lg text-xs font-medium h-8 border-border flex items-center gap-1.5 cursor-pointer bg-background"
                                                >
                                                    <Plus className="size-3.5" />
                                                    Add Model
                                                </Button>
                                            </div>
                                        )}

                                        {/* Tab: Configuration */}
                                        {currentTab === 'configuration' && (
                                            <div className="p-4 rounded-lg border border-border/60 bg-background space-y-3">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            API Key
                                                        </span>
                                                        <p className="text-sm font-mono text-foreground mt-0.5">
                                                            sk-••••••••••••••••••••••••••••••••
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            API Endpoint
                                                        </span>
                                                        <p className="text-sm font-mono text-foreground mt-0.5 truncate">
                                                            {provider.apiUrl || 'Default provider endpoint'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => editProvider(provider)}
                                                    className="mt-2 text-xs"
                                                >
                                                    <SquarePen className="size-3.5 mr-1.5" />
                                                    Edit Configuration
                                                </Button>
                                            </div>
                                        )}

                                        {/* Tab: Usage */}
                                        {currentTab === 'usage' && (
                                            <div className="p-4 rounded-lg border border-border/60 bg-background text-sm text-muted-foreground">
                                                <p className="font-medium text-foreground">Usage & Analytics</p>
                                                <p className="text-xs mt-1">
                                                    No usage limits or billing alerts triggered for this provider during
                                                    the current cycle.
                                                </p>
                                            </div>
                                        )}

                                        {/* Tab: Details */}
                                        {currentTab === 'details' && (
                                            <div className="p-4 rounded-lg border border-border/60 bg-background space-y-2 text-xs text-muted-foreground">
                                                <p>
                                                    <strong className="text-foreground">Type:</strong> {provider.type}
                                                </p>
                                                <p>
                                                    <strong className="text-foreground">Description:</strong>{' '}
                                                    {ProviderInfo[provider.type]?.description ||
                                                        'Custom configured model provider.'}
                                                </p>
                                                <p>
                                                    <strong className="text-foreground">Created:</strong>{' '}
                                                    {provider.createdAt
                                                        ? new Date(provider.createdAt).toLocaleDateString()
                                                        : 'N/A'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : !providersError ? (
                <Card className="p-10 text-center border-dashed rounded-xl bg-card">
                    <p className="text-sm font-medium text-foreground">No providers added yet.</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        Connect your AI providers like Google, OpenAI, or Anthropic to start chatting.
                    </p>
                    <Button
                        onClick={openCreateDialog}
                        size="sm"
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    >
                        <Plus className="size-3.5 mr-1" />
                        Add Provider
                    </Button>
                </Card>
            ) : null}

            {/* Add / Edit Dialog */}
            <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
                <DialogContent className="sm:max-w-[720px] max-h-[85dvh] p-6 overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{editingProvider ? 'Edit Provider' : 'Add Provider'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        {stepper.is('step-1') && (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-2">Select a provider type:</p>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium" htmlFor="provider-search">
                                            Search
                                        </label>
                                        <input
                                            id="provider-search"
                                            type="text"
                                            placeholder="Search providers"
                                            value={providerSearch}
                                            onChange={(e) => setProviderSearch(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                                        />
                                    </div>
                                </div>
                                <ScrollArea type="always" className="h-[50dvh] rounded-md border w-full">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
                                        {filteredProviders.map((providerType) => {
                                            const info = ProviderInfo[providerType.type];
                                            return (
                                                <button
                                                    key={providerType.type}
                                                    type="button"
                                                    onClick={() => changeProviderType(providerType.type)}
                                                    className={`w-full flex items-center gap-3 p-3 border rounded-lg transition-colors text-left ${selectedProviderType === providerType.type ? 'bg-secondary text-secondary-foreground' : 'hover:bg-accent'}`}
                                                >
                                                    <ProviderIcon
                                                        type={providerType.type}
                                                        theme={resolvedTheme}
                                                        size={40}
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium">{info.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {info.description}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        {filteredProviders.length === 0 && (
                                            <div className="col-span-full text-sm text-muted-foreground px-2 py-4 text-center">
                                                No providers match your search.
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                        {selectedProviderType && stepper.is('step-2') && (
                            <div className="space-y-4 pr-2 max-h-[60dvh] overflow-y-auto">
                                <div className="flex items-center gap-2 pb-2 border-b">
                                    <ProviderIcon type={selectedProviderType} theme={resolvedTheme} size={32} />
                                    <div>
                                        <p className="text-sm font-medium">{ProviderInfo[selectedProviderType].name}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Name(Unique)</label>
                                    <input
                                        type="text"
                                        placeholder="Display name (e.g., My OpenAI Account)"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                                    />
                                </div>

                                {!isLocalProvider && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">API Key *</label>
                                        <input
                                            type="password"
                                            placeholder="Enter your API key"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            required
                                            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                                        />
                                    </div>
                                )}

                                {selectedProviderType === ModelProviderTypeEnum.CUSTOM && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">API URL *</label>
                                        <input
                                            type="url"
                                            placeholder="https://api.example.com/v1"
                                            value={apiUrl}
                                            onChange={(e) => setApiUrl(e.target.value)}
                                            required={selectedProviderType === ModelProviderTypeEnum.CUSTOM}
                                            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                                        />
                                    </div>
                                )}

                                {selectedProviderType !== ModelProviderTypeEnum.CUSTOM && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">API URL (optional)</label>
                                        <input
                                            type="url"
                                            placeholder="Leave blank for default"
                                            value={apiUrl}
                                            onChange={(e) => setApiUrl(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        {stepper.is('step-3') && (
                            <div className="space-y-4">
                                <ScrollArea type="always" className="h-[50dvh] rounded-md border w-full">
                                    {isLoadingModels ? (
                                        <Loader />
                                    ) : models.length === 0 ? (
                                        <div className="p-3 text-sm text-muted-foreground">No models available.</div>
                                    ) : (
                                        models.map((model) => (
                                            <div
                                                key={model.modelId}
                                                className="flex items-start justify-between gap-3 p-2"
                                            >
                                                <div className="flex items-center space-x-2 min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        id={model.modelId}
                                                        name={model.modelId}
                                                        checked={selectedModels.some(
                                                            (m) => m.modelId === model.modelId,
                                                        )}
                                                        onChange={() => toggleModel(model.modelId)}
                                                    />
                                                    <label
                                                        htmlFor={model.modelId}
                                                        className="text-sm font-medium cursor-pointer truncate"
                                                    >
                                                        {model.name}
                                                    </label>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <div className="flex items-center gap-2">
                                                        {renderCapabilityIcon({
                                                            label: 'Tool call',
                                                            isPresent: Boolean(model.toolCall),
                                                            icon: <Wrench className="size-4" aria-hidden="true" />,
                                                        })}
                                                        {renderCapabilityIcon({
                                                            label: 'Reasoning',
                                                            isPresent: Boolean(model.reasoning),
                                                            icon: <Brain className="size-4" aria-hidden="true" />,
                                                        })}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span
                                                            className={`inline-flex items-center gap-1 ${capabilityClassName(model.inputModalities.length > 0)}`}
                                                        >
                                                            <ArrowDownToLine className="size-3.5" aria-hidden="true" />
                                                            {model.inputModalities.length > 0
                                                                ? model.inputModalities.map(formatModality).join(', ')
                                                                : 'None'}
                                                        </span>
                                                        <span
                                                            className={`inline-flex items-center gap-1 ${capabilityClassName(model.outputModalities.length > 0)}`}
                                                        >
                                                            <ArrowUpFromLine className="size-3.5" aria-hidden="true" />
                                                            {model.outputModalities.length > 0
                                                                ? model.outputModalities.map(formatModality).join(', ')
                                                                : 'None'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                    <div className="mt-2 space-y-4">
                        {error && (
                            <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-600">
                                {error}
                            </div>
                        )}
                        <DialogFooter>
                            {!stepper.isFirst && (
                                <Button type="button" variant="outline" onClick={() => stepper.prev()}>
                                    Prev
                                </Button>
                            )}
                            {!stepper.isLast && !(selectedProviderType === ModelProviderTypeEnum.CUSTOM) && (
                                <Button
                                    type="button"
                                    disabled={stepper.current.id === 'step-1' && !selectedProviderType}
                                    onClick={() => {
                                        if (stepper.current.id === 'step-2') {
                                            void loadModels();
                                        }
                                        stepper.next();
                                    }}
                                >
                                    Next
                                </Button>
                            )}
                            {(stepper.isLast ||
                                (stepper.current.id === 'step-2' &&
                                    selectedProviderType === ModelProviderTypeEnum.CUSTOM)) && (
                                <Button type="button" onClick={(event) => void saveProviderDraft(event)}>
                                    Save
                                </Button>
                            )}
                            <Button type="button" variant="outline" onClick={closeDialog}>
                                Cancel
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteConfirmation.isOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        clearDeleteConfirmation();
                    }
                }}
                title="Delete Provider"
                description="Are you sure you want to delete this provider? This action cannot be undone."
                confirmText="Delete"
                variant="destructive"
                onConfirm={confirmDeleteProvider}
            />
        </div>
    );
}
