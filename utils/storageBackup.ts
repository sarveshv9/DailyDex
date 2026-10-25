import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ZenBackupEnvelope {
    version: 1;
    exportedAt: string;
    keysCount: number;
    data: Record<string, string>;
}

/**
 * Exports all `@zen_*` (and `@todo_*`) keys from AsyncStorage to a structured JSON string.
 */
export async function exportZenDataToJson(): Promise<string> {
    const allKeys = await AsyncStorage.getAllKeys();
    const zenKeys = allKeys.filter(
        (key) => key.startsWith('@zen_') || key.startsWith('@todo_')
    );

    const pairs = await AsyncStorage.multiGet(zenKeys);
    const data: Record<string, string> = {};

    for (const [key, val] of pairs) {
        if (val !== null) {
            data[key] = val;
        }
    }

    const envelope: ZenBackupEnvelope = {
        version: 1,
        exportedAt: new Date().toISOString(),
        keysCount: Object.keys(data).length,
        data,
    };

    return JSON.stringify(envelope, null, 2);
}

/**
 * Imports and restores all keys from a ZenBackupEnvelope JSON string into AsyncStorage.
 */
export async function importZenDataFromJson(
    jsonStr: string
): Promise<{ success: boolean; restoredCount: number; error?: string }> {
    try {
        const parsed = JSON.parse(jsonStr) as ZenBackupEnvelope;
        if (!parsed || parsed.version !== 1 || !parsed.data || typeof parsed.data !== 'object') {
            return {
                success: false,
                restoredCount: 0,
                error: 'Invalid backup envelope format: missing version 1 or data payload',
            };
        }

        const entries = Object.entries(parsed.data).map(([key, val]) => [key, String(val)] as [string, string]);
        if (entries.length > 0) {
            await AsyncStorage.multiSet(entries);
        }

        return {
            success: true,
            restoredCount: entries.length,
        };
    } catch (e: unknown) {
        return {
            success: false,
            restoredCount: 0,
            error: e instanceof Error ? e.message : 'Failed to parse JSON backup string',
        };
    }
}
