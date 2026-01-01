
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'financial.db');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

export function initBackupTask() {
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Schedule backup daily at midnight (0 0 * * *)
    // For testing/demonstration, you could use '* * * * *' for every minute
    cron.schedule('0 0 * * *', () => {
        performBackup();
    });

    console.log('Database backup task scheduled: Daily at midnight.');
}

export function performBackup() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(BACKUP_DIR, `financial-backup-${timestamp}.db`);

        // Copy the main database file
        fs.copyFileSync(DB_PATH, backupPath);

        // Keep only top 7 backups (optional but recommended)
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('financial-backup-'))
            .sort((a, b) => fs.statSync(path.join(BACKUP_DIR, b)).mtime - fs.statSync(path.join(BACKUP_DIR, a)).mtime);

        if (files.length > 7) {
            files.slice(7).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
        }

        console.log(`[Backup Success] Created: ${backupPath}`);
        return backupPath;
    } catch (error) {
        console.error('[Backup Failed]', error);
    }
}
