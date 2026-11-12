export interface FolderPickerService {
    /**
     * Indicates whether interactive native directory picking is supported in the current runtime environment.
     */
    isSupported(): boolean;

    /**
     * Prompts the user to select a directory on the local filesystem.
     * Returns the selected path string, or null if cancelled or unsupported.
     */
    pickDirectory(): Promise<string | null>;
}
