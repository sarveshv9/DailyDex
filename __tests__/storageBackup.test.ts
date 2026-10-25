import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    exportZenDataToJson,
    importZenDataFromJson,
    ZenBackupEnvelope,
} from '../utils/storageBackup';

jest.mock('@react-native-async-storage/async-storage', () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('Storage Backup & Restore Utility', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
    });

    it('exports all @zen_* and @todo_* keys while ignoring foreign keys', async () => {
        await AsyncStorage.setItem('@zen_tasks', JSON.stringify([{ id: '1', title: 'Task 1' }]));
        await AsyncStorage.setItem('@zen_routine', JSON.stringify([{ id: 'wake', name: 'Wake Up' }]));
        await AsyncStorage.setItem('@todo_tasks', JSON.stringify(['legacy']));
        await AsyncStorage.setItem('foreign_unrelated_key', 'do_not_export');

        const exportedJson = await exportZenDataToJson();
        const envelope: ZenBackupEnvelope = JSON.parse(exportedJson);

        expect(envelope.version).toBe(1);
        expect(envelope.keysCount).toBe(3);
        expect(envelope.data['@zen_tasks']).toBe(JSON.stringify([{ id: '1', title: 'Task 1' }]));
        expect(envelope.data['@zen_routine']).toBe(JSON.stringify([{ id: 'wake', name: 'Wake Up' }]));
        expect(envelope.data['@todo_tasks']).toBe(JSON.stringify(['legacy']));
        expect(envelope.data['foreign_unrelated_key']).toBeUndefined();
    });

    it('restores all keys from a valid backup envelope', async () => {
        const backupPayload: ZenBackupEnvelope = {
            version: 1,
            exportedAt: new Date().toISOString(),
            keysCount: 2,
            data: {
                '@zen_user_profile': JSON.stringify({ name: 'Sarvesh', role: 'Dev' }),
                '@zen_user_settings_v2': JSON.stringify({ autoTheme: true }),
            },
        };

        const result = await importZenDataFromJson(JSON.stringify(backupPayload));
        expect(result.success).toBe(true);
        expect(result.restoredCount).toBe(2);

        const restoredProfile = await AsyncStorage.getItem('@zen_user_profile');
        const restoredSettings = await AsyncStorage.getItem('@zen_user_settings_v2');

        expect(restoredProfile).toBe(backupPayload.data['@zen_user_profile']);
        expect(restoredSettings).toBe(backupPayload.data['@zen_user_settings_v2']);
    });

    it('rejects corrupted or unparseable JSON gracefully', async () => {
        const result = await importZenDataFromJson('invalid { corrupted json');
        expect(result.success).toBe(false);
        expect(result.restoredCount).toBe(0);
        expect(result.error).toBeDefined();
    });

    it('rejects invalid envelope structure without version 1 or data payload', async () => {
        const result = await importZenDataFromJson(JSON.stringify({ someField: 'value' }));
        expect(result.success).toBe(false);
        expect(result.restoredCount).toBe(0);
        expect(result.error).toContain('Invalid backup envelope');
    });
});
