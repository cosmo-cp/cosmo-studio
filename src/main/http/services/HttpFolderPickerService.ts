import { FolderPickerService } from 'core/platform/FolderPickerService';
import { injectable } from 'inversify';

@injectable()
export class HttpFolderPickerService implements FolderPickerService {
    public isSupported(): boolean {
        return false;
    }

    public async pickDirectory(): Promise<string | null> {
        return null;
    }
}
