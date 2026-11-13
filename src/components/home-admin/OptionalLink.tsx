import { LinkFields } from '@/components/home-admin/fields';
import type { LinkType, OpenMode } from '@/lib/home-layout';

type LinkPatch = {link_type: LinkType | null;link_value: string | null;open_mode: OpenMode;};

/** "Where does it go?" picker with a "No link" choice. */
export function OptionalLink({ linkType, linkValue, openMode, onChange, label = 'Where does it go?', allowNone = true


}: {linkType?: LinkType | null;linkValue?: string | null;openMode?: OpenMode;onChange: (l: LinkPatch) => void;label?: string;allowNone?: boolean;}) {
  const none = !linkType;
  return (
    <LinkFields
      label={label}
      linkType={linkType ?? 'portal'}
      linkValue={linkValue ?? (none ? '' : '/news')}
      openMode={openMode ?? 'auto'}
      none={allowNone && none}
      onNoneChange={allowNone ? (v) => {
        if (v) onChange({ link_type: null, link_value: null, open_mode: 'auto' });
      } : undefined}
      onChange={(l) => onChange(l)} />);
}
