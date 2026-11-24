'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useGuardrailsPageState } from '@/features/guardrails/use-guardrails-page-state';
import { cn } from '@/lib/utils';
import { EyeOff, FileLock2, KeyRound, ShieldAlert } from 'lucide-react';

export function GuardrailsManagement() {
    const { formState, isSaving, updateField } = useGuardrailsPageState();

    return (
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 max-w-4xl mx-auto space-y-4">
            {/* Master Switch Banner */}
            <Card className="border-border bg-card/60 shadow-2xs">
                <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                        <span className="text-sm font-semibold text-foreground">Master Guardrails Enforcement</span>
                        <p className="text-xs text-muted-foreground truncate sm:whitespace-normal">
                            Validate prompt inputs and outputs locally before communicating with model providers.
                        </p>
                    </div>
                    <Switch
                        checked={formState.enabled}
                        onCheckedChange={(checked) => updateField('enabled', checked)}
                        aria-label="Toggle Master Guardrails Enforcement"
                    />
                </CardContent>
            </Card>

            {/* Guardrails Controls List */}
            <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-semibold text-foreground">Security Guardrails</h2>
                    <div className="flex items-center gap-2">
                        {isSaving && <span className="text-[11px] text-muted-foreground animate-pulse">Saving...</span>}
                        <Badge variant="outline" className="text-[11px] h-4.5 px-1.5 font-normal">
                            {
                                [
                                    formState.injectionEnabled,
                                    formState.leakageEnabled,
                                    formState.piiEnabled,
                                    formState.secretEnabled,
                                ].filter(Boolean).length
                            }{' '}
                            of 4 Active
                        </Badge>
                    </div>
                </div>

                <div
                    role="list"
                    className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden"
                >
                    {/* Prompt Injection Defense */}
                    <div
                        role="listitem"
                        className={cn('p-4 transition-colors', !formState.enabled && 'opacity-60 pointer-events-none')}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-1.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 shrink-0">
                                    <ShieldAlert className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-medium text-foreground">Prompt Injection Defense</h3>
                                    <p className="text-xs text-muted-foreground truncate sm:whitespace-normal">
                                        Detects adversarial inputs, jailbreaks, and instructions attempting to hijack
                                        assistant context.
                                    </p>
                                </div>
                            </div>

                            <Switch
                                checked={formState.injectionEnabled}
                                onCheckedChange={(checked) => updateField('injectionEnabled', checked)}
                                aria-label="Toggle Prompt Injection Defense"
                            />
                        </div>

                        <div
                            className={cn(
                                'mt-3 pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:pl-8 transition-opacity',
                                (!formState.enabled || !formState.injectionEnabled) && 'opacity-50 pointer-events-none',
                            )}
                        >
                            <div className="space-y-1">
                                <span className="text-[11px] font-medium text-foreground">Detection Mode</span>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={formState.injectionMode === 'heuristic' ? 'default' : 'outline'}
                                        className="flex-1 text-xs h-7 px-2"
                                        onClick={() => updateField('injectionMode', 'heuristic')}
                                    >
                                        Heuristic (Fuzzy)
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={formState.injectionMode === 'pattern' ? 'default' : 'outline'}
                                        className="flex-1 text-xs h-7 px-2"
                                        onClick={() => updateField('injectionMode', 'pattern')}
                                    >
                                        Pattern (Regex)
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="font-medium text-foreground">Sensitivity</span>
                                    <span className="font-mono text-muted-foreground">
                                        {formState.injectionThreshold.toFixed(2)}
                                    </span>
                                </div>
                                <Slider
                                    min={0.3}
                                    max={0.95}
                                    step={0.05}
                                    value={[formState.injectionThreshold]}
                                    onValueChange={(vals) => updateField('injectionThreshold', vals[0])}
                                    className="py-1"
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                    <span>Strict</span>
                                    <span>Balanced</span>
                                    <span>Permissive</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Prompt Leakage Defense */}
                    <div
                        role="listitem"
                        className={cn('p-4 transition-colors', !formState.enabled && 'opacity-60 pointer-events-none')}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-1.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                                    <FileLock2 className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-medium text-foreground">Prompt Leakage Defense</h3>
                                    <p className="text-xs text-muted-foreground truncate sm:whitespace-normal">
                                        Blocks extraction queries asking the model to dump system prompts or persona
                                        instructions.
                                    </p>
                                </div>
                            </div>

                            <Switch
                                checked={formState.leakageEnabled}
                                onCheckedChange={(checked) => updateField('leakageEnabled', checked)}
                                aria-label="Toggle Prompt Leakage Defense"
                            />
                        </div>

                        <div
                            className={cn(
                                'mt-3 pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:pl-8 transition-opacity',
                                (!formState.enabled || !formState.leakageEnabled) && 'opacity-50 pointer-events-none',
                            )}
                        >
                            <div className="space-y-1">
                                <span className="text-[11px] font-medium text-foreground">Detection Mode</span>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={formState.leakageMode === 'heuristic' ? 'default' : 'outline'}
                                        className="flex-1 text-xs h-7 px-2"
                                        onClick={() => updateField('leakageMode', 'heuristic')}
                                    >
                                        Heuristic (Fuzzy)
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={formState.leakageMode === 'pattern' ? 'default' : 'outline'}
                                        className="flex-1 text-xs h-7 px-2"
                                        onClick={() => updateField('leakageMode', 'pattern')}
                                    >
                                        Pattern (Regex)
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="font-medium text-foreground">Sensitivity</span>
                                    <span className="font-mono text-muted-foreground">
                                        {formState.leakageThreshold.toFixed(2)}
                                    </span>
                                </div>
                                <Slider
                                    min={0.3}
                                    max={0.95}
                                    step={0.05}
                                    value={[formState.leakageThreshold]}
                                    onValueChange={(vals) => updateField('leakageThreshold', vals[0])}
                                    className="py-1"
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                    <span>Strict</span>
                                    <span>Balanced</span>
                                    <span>Permissive</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PII Privacy Protection */}
                    <div
                        role="listitem"
                        className={cn('p-4 transition-colors', !formState.enabled && 'opacity-60 pointer-events-none')}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                                    <EyeOff className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-medium text-foreground">PII Privacy Protection</h3>
                                    <p className="text-xs text-muted-foreground truncate sm:whitespace-normal">
                                        Scans for emails, phone numbers, SSNs, credit cards, and personal contact
                                        information.
                                    </p>
                                </div>
                            </div>

                            <Switch
                                checked={formState.piiEnabled}
                                onCheckedChange={(checked) => updateField('piiEnabled', checked)}
                                aria-label="Toggle PII Privacy Protection"
                            />
                        </div>

                        <div
                            className={cn(
                                'mt-3 pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center sm:pl-8 transition-opacity',
                                (!formState.enabled || !formState.piiEnabled) && 'opacity-50 pointer-events-none',
                            )}
                        >
                            <div className="space-y-1">
                                <Label className="text-[11px] font-medium text-foreground">Enforcement Action</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={formState.piiMode === 'redact' ? 'default' : 'outline'}
                                        className="flex-1 text-xs h-7 px-2"
                                        onClick={() => updateField('piiMode', 'redact')}
                                    >
                                        Redact & Mask
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={formState.piiMode === 'block' ? 'default' : 'outline'}
                                        className="flex-1 text-xs h-7 px-2"
                                        onClick={() => updateField('piiMode', 'block')}
                                    >
                                        Block Message
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {formState.piiMode === 'redact'
                                    ? 'Replaces sensitive entities with [REDACTED-*] before sending to remote models.'
                                    : 'Aborts the request immediately if personal identification data is identified.'}
                            </p>
                        </div>
                    </div>

                    {/* Secret & Credential Shield */}
                    <div
                        role="listitem"
                        className={cn('p-4 transition-colors', !formState.enabled && 'opacity-60 pointer-events-none')}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                                    <KeyRound className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-medium text-foreground">Secret & Credential Shield</h3>
                                    <p className="text-xs text-muted-foreground truncate sm:whitespace-normal">
                                        Catches API keys, AWS credentials, GitHub tokens, and high-entropy secret
                                        strings.
                                    </p>
                                </div>
                            </div>

                            <Switch
                                checked={formState.secretEnabled}
                                onCheckedChange={(checked) => updateField('secretEnabled', checked)}
                                aria-label="Toggle Secret & Credential Shield"
                            />
                        </div>

                        <div
                            className={cn(
                                'mt-3 pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center sm:pl-8 transition-opacity',
                                (!formState.enabled || !formState.secretEnabled) && 'opacity-50 pointer-events-none',
                            )}
                        >
                            <div className="space-y-1">
                                <Label className="text-[11px] font-medium text-foreground">Enforcement Action</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={formState.secretMode === 'block' ? 'default' : 'outline'}
                                        className="flex-1 text-xs h-7 px-2"
                                        onClick={() => updateField('secretMode', 'block')}
                                    >
                                        Block Message
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={formState.secretMode === 'redact' ? 'default' : 'outline'}
                                        className="flex-1 text-xs h-7 px-2"
                                        onClick={() => updateField('secretMode', 'redact')}
                                    >
                                        Redact & Mask
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {formState.secretMode === 'block'
                                    ? 'Stops transmission immediately to protect your credentials from accidental external leaks.'
                                    : 'Masks secrets before sending to inference providers.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
