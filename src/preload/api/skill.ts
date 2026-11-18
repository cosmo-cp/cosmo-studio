import { ipcRenderer } from 'electron';
import type { SkillApi } from '../contracts/skill';

export const skillApi: SkillApi = {
    getAll: () => {
        return ipcRenderer.invoke('skill:getAll');
    },
    getByName: (name: string) => {
        return ipcRenderer.invoke('skill:getByName', name);
    },
    getContent: (name: string) => {
        return ipcRenderer.invoke('skill:getContent', name);
    },
};
