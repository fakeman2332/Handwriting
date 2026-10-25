import { BACKUP_EXTENSION, serializeBackup } from '../../core/format';
import { slug } from '../../core/font';
import type { HandwritingFont } from '../../core/types';
import { downloadBlob } from './download';

export function downloadBackup(font: HandwritingFont): void {
  downloadBlob(new Blob([serializeBackup(font)], { type: 'application/json' }), `${slug(font.name)}${BACKUP_EXTENSION}`);
}
