import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFonts } from '../../app/store';
import { CHARSET_IDS, CHARSETS } from '../../core/charsets';
import type { CharsetId } from '../../core/types';
import { useLocale, useT } from '../../locales/i18n';

export function CharsetPicker({ value, onChange }: { value: CharsetId[]; onChange: (v: CharsetId[]) => void }) {
  const t = useT();
  return (
    <div className="charset-picker">
      {CHARSET_IDS.map((id) => (
        <label key={id} className="check">
          <input
            type="checkbox"
            checked={value.includes(id)}
            onChange={(e) => onChange(e.target.checked ? [...value, id] : value.filter((v) => v !== id))}
          />
          <span>
            {t(`charset.${id}`)} <span className="muted">· {[...CHARSETS[id]].length}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

export function CreateFontPage() {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const navigate = useNavigate();
  const { list, create } = useFonts();
  const [name, setName] = useState('');
  const [charsets, setCharsets] = useState<CharsetId[]>(
    locale === 'ru' ? ['cyrillic', 'digits', 'punct'] : ['latin', 'digits', 'punct'],
  );
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (charsets.length === 0) return;
    setBusy(true);
    const font = await create(name || t('create.namePlaceholder'), charsets);
    navigate(`/font/${font.id}`);
  };

  return (
    <section className="page narrow">
      <h1>{t('create.title')}</h1>
      {list.length === 0 && <p className="lead">{t('create.firstRun')}</p>}
      <form className="card form" onSubmit={(e) => void submit(e)}>
        <label className="field">
          <span>{t('create.name')}</span>
          <input
            type="text"
            value={name}
            placeholder={t('create.namePlaceholder')}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <fieldset className="field">
          <legend>{t('create.charsets')}</legend>
          <CharsetPicker value={charsets} onChange={setCharsets} />
        </fieldset>
        <button className="btn primary" type="submit" disabled={busy || charsets.length === 0}>
          {t('create.submit')}
        </button>
      </form>
    </section>
  );
}
