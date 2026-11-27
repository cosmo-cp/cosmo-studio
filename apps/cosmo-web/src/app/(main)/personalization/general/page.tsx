import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function GeneralPage() {
    return (
        <div className="flex flex-col gap-4 p-4">
            <div>
                <h1 className="text-lg font-medium">General</h1>
                <p className="mt-1 text-xs text-muted-foreground">Manage your personal preferences.</p>
            </div>
            <section className="rounded-md border p-4">
                <h2 className="text-sm font-medium">Chat personas</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                    Create reusable instructions and select a persona in a chat.
                </p>
                <Button asChild variant="outline" className="mt-4">
                    <Link href="/settings/persona">Manage personas</Link>
                </Button>
            </section>
        </div>
    );
}
