import { PersonaList } from '@/components/persona-list';

export default function PersonaPage() {
    return (
        <div className="flex flex-col p-2 md:p-4 h-full w-full">
            <PersonaList />
        </div>
    );
}
