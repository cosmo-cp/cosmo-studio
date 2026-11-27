import { PersonaList } from '@/components/persona-list';

export default function PersonaSettingsPage() {
    return (
        <div className="flex h-full w-full flex-col overflow-y-auto p-4">
            <PersonaList />
        </div>
    );
}
