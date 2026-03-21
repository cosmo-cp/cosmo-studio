import {Card, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';

const webSearchSections = [
    {
        title: 'Default behavior',
        description:
            'Use this section for search enablement, provider defaults, and when live web results are allowed.',
    },
    {
        title: 'Result handling',
        description:
            'Use this section for freshness rules, citation display, and how web results should appear in chat responses.',
    },
];

export default function WebSearchSettingsPage() {
    return (
        <div className="flex h-full w-full flex-col gap-6 overflow-y-auto p-4">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold">Web search</h1>
                <p className="text-sm text-muted-foreground">
                    A dedicated page for web-search-specific settings.
                </p>
            </header>

            <div className="grid gap-4 md:grid-cols-2">
                {webSearchSections.map((section) => (
                    <Card key={section.title} className="border-border/80">
                        <CardHeader>
                            <CardTitle className="text-base">{section.title}</CardTitle>
                            <CardDescription>{section.description}</CardDescription>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </div>
    );
}
