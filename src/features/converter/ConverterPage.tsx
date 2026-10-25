import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TEXT_LIMIT, useConverter, useFonts } from '../../app/store';
import { slug } from '../../core/font';
import { prepareFont } from '../../core/align';
import { FAMILY_NAME_MAX, formatVersion, isValidVersion, nextVersion, OTF_DEFAULT_PEN } from '../../core/otf-defaults';
import type { HandwritingFont } from '../../core/types';
import { INK_PRESETS, type PageFormat, type PaperKind } from '../../core/types';
import { useT } from '../../locales/i18n';
import { useDebounced } from '../../ui/useDebounced';
import { useMedia } from '../../ui/useMedia';
import { glyphPath } from '../../app/routes';
import { downloadBlob } from '../export/download';
import { useFont } from '../fonts/useFont';
import { PagePreview } from './PagePreview';
import { useLayout } from './useLayout';

export function ConverterPage() {
  const t = useT();
  const navigate = useNavigate();
  const fonts = useFonts((s) => s.list);
  const fontsReady = useFonts((s) => s.ready);
  const { loaded, text, settings, seed, customColor, setText, patch, setCustomColor, regenerate } = useConverter();
  const fontId = fonts.some((f) => f.id === settings.fontId) ? settings.fontId : fonts[0]?.id;
  const font = useFont(fontId);
  const updateMeta = useFonts((s) => s.updateMeta);
  // Шрифт для вывода: с выравниванием букв, если оно включено. Хранилище не меняется.
  const renderFont = useMemo(() => (font ? prepareFont(font, settings.align) : font), [font, settings.align]);
  const mobile = useMedia('(max-width: 800px)');
  const [tab, setTab] = useState<'text' | 'sheet'>('text');
  const [busy, setBusy] = useState(false);
  const [otfOpen, setOtfOpen] = useState(false);

  useEffect(() => {
    if (fontId && fontId !== settings.fontId) patch({ fontId });
  }, [fontId, settings.fontId, patch]);

  // Превью пересчитывается с задержкой 300 мс после ввода.
  const debouncedText = useDebounced(text, 300);
  const { result, pending } = useLayout(debouncedText, renderFont, settings, seed);

  const missing = useMemo(() => {
    if (!result) return [];
    return [...new Set(result.glyphs.filter((g) => !g.variant).map((g) => g.char))];
  }, [result]);

  if (!loaded || !fontsReady) return <p className="muted">{t('common.loading')}</p>;
  if (fonts.length === 0)
    return (
      <section className="page narrow">
        <h1>{t('convert.title')}</h1>
        <p>{t('convert.noFonts')}</p>
        <Link className="btn primary" to="/new">
          {t('fonts.new')}
        </Link>
      </section>
    );

  const baseName = font ? slug(font.name) : 'handwriting';
  const run = async (fn: () => Promise<void> | void) => {
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 30));
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const onMissing = (char: string) => font && navigate(glyphPath(font.id, char, '?return=convert'));

  const exportPngAction = () =>
    void run(async () => {
      const { exportPng } = await import('../export/png');
      const { blob, filename } = await exportPng(result!.glyphs, result!.pageCount, renderFont!, settings, baseName);
      downloadBlob(blob, filename);
    });
  const exportPdfAction = () =>
    void run(async () => {
      const { buildPdf, pdfBlob } = await import('../export/pdf');
      downloadBlob(pdfBlob(buildPdf(result!.glyphs, result!.pageCount, renderFont!, settings)), `${baseName}.pdf`);
    });
  const printAction = () =>
    void run(async () => {
      const { buildPdf, printPdf } = await import('../export/pdf');
      printPdf(buildPdf(result!.glyphs, result!.pageCount, renderFont!, settings));
    });
  const canExport = !!result && !!font && !busy && debouncedText.trim().length > 0;

  const settingsPanel = (
    <div className="settings">
      <section className="settings-group">
        <h2>{t('convert.groupFont')}</h2>
        <label className="field">
          <span className="sr-only">{t('convert.font')}</span>
          <select value={fontId} onChange={(e) => patch({ fontId: e.target.value })}>
            {fonts.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.align} onChange={(e) => patch({ align: e.target.checked })} />
          <span>
            {t('convert.align')}
            <span className="muted small block">{t('convert.alignHint')}</span>
          </span>
        </label>
      </section>

      <section className="settings-group">
        <h2>{t('convert.ink')}</h2>
        <div className="segmented" role="radiogroup" aria-label={t('convert.ink')}>
          {(Object.keys(INK_PRESETS) as (keyof typeof INK_PRESETS)[]).map((k) => (
            <label key={k} className={settings.ink.kind === 'preset' && settings.ink.value === k ? 'on' : ''}>
              <input type="radio" name="ink" checked={settings.ink.kind === 'preset' && settings.ink.value === k} onChange={() => patch({ ink: { kind: 'preset', value: k } })} />
              <span className="swatch" style={{ background: INK_PRESETS[k] }} />
              {t(`convert.ink.${k}`)}
            </label>
          ))}
          <label className={settings.ink.kind === 'custom' ? 'on' : ''}>
            <input type="radio" name="ink" checked={settings.ink.kind === 'custom'} onChange={() => setCustomColor(customColor)} />
            <input type="color" value={customColor} aria-label={t('convert.ink.custom')} onChange={(e) => setCustomColor(e.target.value)} />
            {t('convert.ink.custom')}
          </label>
        </div>
        <label className="field">
          <span>
            {t('convert.pen')} <span className="muted">{settings.penSize.toFixed(2)} {t('common.mm')}</span>
          </span>
          <input type="range" min={0.2} max={1.2} step={0.05} value={settings.penSize} onChange={(e) => patch({ penSize: Number(e.target.value) })} />
        </label>
      </section>

      <section className="settings-group">
        <h2>{t('convert.paper')}</h2>
        <div className="segmented" role="radiogroup" aria-label={t('convert.paper')}>
          {(['blank', 'lined', 'grid'] as PaperKind[]).map((p) => (
            <label key={p} className={settings.paper === p ? 'on' : ''}>
              <input type="radio" name="paper" checked={settings.paper === p} onChange={() => patch({ paper: p })} />
              {t(`convert.paper.${p}`)}
            </label>
          ))}
        </div>
        <div className="segmented" role="radiogroup" aria-label={t('convert.format')}>
          {(['A4', 'A5'] as PageFormat[]).map((f) => (
            <label key={f} className={settings.pageFormat === f ? 'on' : ''}>
              <input type="radio" name="format" checked={settings.pageFormat === f} onChange={() => patch({ pageFormat: f })} />
              {f}
            </label>
          ))}
        </div>
        <label className="field">
          <span>
            {t('convert.size')} <span className="muted">{settings.textSize.toFixed(1)} {t('common.mm')}</span>
          </span>
          <input type="range" min={2.5} max={10} step={0.5} value={settings.textSize} onChange={(e) => patch({ textSize: Number(e.target.value) })} />
        </label>
      </section>
    </div>
  );

  const textArea = (
    <div className="converter-input">
      <label className="sr-only" htmlFor="conv-text">
        {t('convert.text')}
      </label>
      <textarea
        id="conv-text"
        value={text}
        maxLength={TEXT_LIMIT}
        placeholder={t('convert.placeholder')}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="row spread small muted">
        <span>{t('convert.chars', { count: text.length })}</span>
        {text.length >= TEXT_LIMIT && <span className="warn-text">{t('convert.limit', { count: TEXT_LIMIT })}</span>}
      </div>
    </div>
  );

  const missingNote = missing.length > 0 && (
    <div className="note warn missing">
      <span>{t('convert.missingCount', { count: missing.length })}</span>
      <span className="missing-chips">
        {missing.slice(0, 16).map((c) => (
          <button key={c} className="chip" onClick={() => onMissing(c)} aria-label={t('convert.drawChar', { char: c })}>
            {c}
          </button>
        ))}
        {missing.length > 16 && <span className="muted small">{t('convert.andMore', { count: missing.length - 16 })}</span>}
      </span>
    </div>
  );

  const sheetPanel = (
    <div className="converter-sheet">
      <div className="sheet-bar">
        <div className="row">
          <button className="btn ghost" onClick={regenerate} title={t('convert.regenerateHint')}>
            ⟳ {t('convert.regenerate')}
          </button>
          {result && debouncedText.trim() && <span className="muted small">{t('convert.pages', { count: result.pageCount })}</span>}
          {(pending || busy) && (
            <span className="muted small" role="status">
              {busy ? t('convert.exporting') : t('common.loading')}
            </span>
          )}
        </div>
        <div className="row wrap export-group" role="group" aria-label={t('convert.export')}>
          <button className="btn primary" disabled={!canExport} onClick={exportPdfAction} aria-label={t('convert.downloadPdf')}>
            ↓ {mobile ? t('convert.pdf') : t('convert.downloadPdf')}
          </button>
          <button className="btn" disabled={!canExport} onClick={exportPngAction}>
            {t('convert.png')}
          </button>
          <button className="btn" disabled={!canExport} onClick={printAction}>
            {t('convert.print')}
          </button>
          <button className="btn ghost" disabled={!font} onClick={() => setOtfOpen(true)} aria-label={t('convert.otf')}>
            {mobile ? 'OTF' : t('convert.otf')}
          </button>
        </div>
      </div>
      {missingNote}
      {!debouncedText.trim() ? (
        <div className="empty card">
          <p className="muted">{t('convert.empty')}</p>
          {mobile && (
            <button className="btn" onClick={() => setTab('text')}>
              {t('convert.toText')}
            </button>
          )}
        </div>
      ) : (
        <div className="sheets">
          {result &&
            font &&
            Array.from({ length: result.pageCount }, (_, p) => (
              <PagePreview key={p} glyphs={result.glyphs} page={p} font={renderFont!} settings={settings} onMissing={onMissing} />
            ))}
        </div>
      )}
      {otfOpen && font && (
        <OtfDialog
          font={font}
          onClose={() => setOtfOpen(false)}
          onDownload={(pen, name, version) =>
            void run(async () => {
              (await import('../export/otf')).downloadOtf(prepareFont(font, settings.align), pen, name, version);
              const entry = { name, version, penSize: pen, at: Date.now() };
              await updateMeta({ exports: [...(font.exports ?? []), entry] });
            })
          }
        />
      )}
    </div>
  );

  return (
    <section className="page converter">
      <h1 className="sr-only">{t('convert.title')}</h1>
      {mobile ? (
        <>
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'text'} onClick={() => setTab('text')}>
              {t('convert.text')}
            </button>
            <button role="tab" aria-selected={tab === 'sheet'} onClick={() => setTab('sheet')}>
              {t('convert.sheet')}
              {result && debouncedText.trim() ? ` · ${result.pageCount}` : ''}
            </button>
          </div>
          {tab === 'text' ? (
            <div className="converter-text">
              {textArea}
              <button className="btn primary large block-btn" onClick={() => setTab('sheet')} disabled={!text.trim()}>
                {t('convert.showSheet')} →
              </button>
              <details className="settings-details">
                <summary>{t('convert.settings')}</summary>
                {settingsPanel}
              </details>
            </div>
          ) : (
            sheetPanel
          )}
        </>
      ) : (
        <div className="converter-cols">
          <div className="converter-text">
            {textArea}
            {settingsPanel}
          </div>
          {sheetPanel}
        </div>
      )}
    </section>
  );
}

function OtfDialog({
  font,
  onClose,
  onDownload,
}: {
  font: HandwritingFont;
  onClose: () => void;
  onDownload: (pen: number, name: string, version: string) => void;
}) {
  const t = useT();
  const history = font.exports ?? [];
  const last = history[history.length - 1];
  const [name, setName] = useState(() => (last?.name ?? font.name).slice(0, FAMILY_NAME_MAX));
  const [version, setVersion] = useState(() => nextVersion(last?.version));
  const [pen, setPen] = useState(last?.penSize ?? OTF_DEFAULT_PEN);
  const validVersion = isValidVersion(version);
  const notNewer = validVersion && last !== undefined && Number(version) <= Number(last.version) && name.trim() === last.name;
  const valid = name.trim().length > 0 && validVersion;
  const fmtDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="otf-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onDownload(pen, name.trim(), formatVersion(version));
          onClose();
        }}
      >
        <h2 id="otf-title">{t('otf.title')}</h2>
        <p className="note">{t('otf.note')}</p>
        <label className="field">
          <span>
            {t('otf.name')}{' '}
            <span className="muted">
              {name.length}/{FAMILY_NAME_MAX}
            </span>
          </span>
          <input type="text" value={name} maxLength={FAMILY_NAME_MAX} onChange={(e) => setName(e.target.value)} autoFocus required />
        </label>
        <label className="field">
          <span>{t('otf.version')}</span>
          <input
            type="text"
            inputMode="decimal"
            value={version}
            onChange={(e) => setVersion(e.target.value.replace(',', '.'))}
            aria-invalid={!validVersion}
            aria-describedby="otf-version-hint"
          />
          <span id="otf-version-hint" className={validVersion && !notNewer ? 'muted small' : 'small warn-text'}>
            {!validVersion ? t('otf.versionInvalid') : notNewer ? t('otf.versionNotNewer', { last: last!.version }) : t('otf.versionHint')}
          </span>
        </label>
        <label className="field">
          <span>
            {t('otf.pen')} <span className="muted">{pen}</span>
          </span>
          <input type="range" min={30} max={140} step={5} value={pen} onChange={(e) => setPen(Number(e.target.value))} />
        </label>
        {history.length > 0 && (
          <details className="otf-history">
            <summary>{t('otf.history', { count: history.length })}</summary>
            <ul>
              {[...history].reverse().slice(0, 10).map((h) => (
                <li key={h.at}>
                  <span>
                    {h.name} {h.version}
                  </span>
                  <span className="muted">{fmtDate(h.at)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
        <p className="muted small">{t('otf.usage')}</p>
        <div className="row end">
          <button type="button" className="btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn primary" disabled={!valid}>
            {t('otf.download')}
          </button>
        </div>
      </form>
    </div>
  );
}
