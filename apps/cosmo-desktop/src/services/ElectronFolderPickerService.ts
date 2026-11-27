import { FolderPickerService } from 'core/platform/FolderPickerService';
import { dialog } from 'electron';
import { injectable } from 'inversify';

@injectable()
export class ElectronFolderPickerService implements FolderPickerService {
    public isSupported(): boolean {
        return true;
    }

    public async pickDirectory(): Promise<string | null> {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory'],
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        return result.filePaths[0];
    }
}
