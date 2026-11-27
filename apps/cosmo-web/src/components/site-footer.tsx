import { Heart } from 'lucide-react';
import Link from 'next/link';

export function SiteFooter() {
    return (
        <footer>
            <div className="px-2 py-3 lg:px-6 pb-0">
                <div className="flex flex-col items-center justify-center space-y-2 text-center">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>Made with</span>
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                        <span>by</span>
                        <Link
                            href="https://github.com/cosmo-cp/cosmo-studio"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:text-primary text-blue-600"
                        >
                            Cosmo-CP Team
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
