import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Bookmark,
  Bug,
  Clock3,
  Copy,
  FileText,
  Globe,
  LayoutDashboard,
  Link2,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Webhook,
  Wrench,
  Zap,
} from 'lucide-react';

export const importantItemTones = ['blue', 'green', 'orange', 'purple', 'cyan', 'red'];
export const quickAccessActionTypes = ['none', 'dashboard', 'create', 'workspace-settings', 'selected-endpoint', 'response-studio', 'endpoint', 'url'];
export const quickAccessInteractionModes = ['open', 'copy'];
export const quickAccessOpenModes = ['same-tab', 'new-tab'];
export const quickAccessActions = [
  { value: 'none', label: 'Note only', description: 'Keep a pinned reference without navigation.' },
  { value: 'dashboard', label: 'Workspace overview', description: 'Jump to the dashboard.' },
  { value: 'create', label: 'Create route', description: 'Open the create endpoint modal.' },
  { value: 'workspace-settings', label: 'Workspace settings', description: 'Open the settings modal.' },
  { value: 'selected-endpoint', label: 'Current endpoint', description: 'Open the endpoint currently active in the workspace.' },
  { value: 'response-studio', label: 'Current response studio', description: 'Jump into response tools for the current endpoint.' },
  { value: 'endpoint', label: 'Specific endpoint', description: 'Open a saved endpoint directly.' },
  { value: 'url', label: 'External URL', description: 'Open an external link in one click.' },
];
export const quickAccessInteractionOptions = [
  { value: 'open', label: 'Open target' },
  { value: 'copy', label: 'Copy URL' },
];
export const quickAccessOpenModeOptions = [
  { value: 'same-tab', label: 'Same tab' },
  { value: 'new-tab', label: 'New tab' },
];
export const quickAccessIconOptions = [
  { value: 'auto', label: 'Auto', icon: Sparkles, description: 'Use the icon that matches the shortcut action.' },
  { value: 'alert', label: 'Alert', icon: AlertTriangle, description: 'Useful for incidents, broken flows, and blocking issues.' },
  { value: 'bug', label: 'Bug', icon: Bug, description: 'Pin errors, exception links, or debugging paths.' },
  { value: 'bookmark', label: 'Bookmark', icon: Bookmark, description: 'Keep a general saved item or internal note.' },
  { value: 'clock', label: 'Clock', icon: Clock3, description: 'Track time-sensitive follow-ups or temporary items.' },
  { value: 'doc', label: 'Document', icon: FileText, description: 'Point to runbooks, docs, or reference text.' },
  { value: 'globe', label: 'Globe', icon: Globe, description: 'Use for external dashboards or public pages.' },
  { value: 'link', label: 'Link', icon: Link2, description: 'Generic outbound shortcut icon.' },
  { value: 'shield', label: 'Shield', icon: ShieldCheck, description: 'Good for response controls or protected systems.' },
  { value: 'tool', label: 'Tool', icon: Wrench, description: 'Use for admin tools, fix flows, or maintenance tasks.' },
  { value: 'webhook', label: 'Webhook', icon: Webhook, description: 'Best for endpoint and route-specific shortcuts.' },
  { value: 'zap', label: 'Zap', icon: Zap, description: 'Highlight hot paths, live flows, or fast actions.' },
];

let quickAccessSeed = 0;

function createQuickAccessId(prefix = 'important') {
  quickAccessSeed += 1;
  return `${prefix}-${Date.now().toString(36)}-${quickAccessSeed.toString(36)}`;
}

export function createQuickAccessItem(index = 0, overrides = {}) {
  return {
    id: typeof overrides.id === 'string' && overrides.id.trim() ? overrides.id : createQuickAccessId(`important-${index + 1}`),
    label: typeof overrides.label === 'string' ? overrides.label.slice(0, 48) : '',
    detail: typeof overrides.detail === 'string' ? overrides.detail.slice(0, 180) : '',
    tone: normalizeImportantTone(overrides.tone, index),
    actionType: normalizeQuickAccessActionType(overrides.actionType),
    target: typeof overrides.target === 'string' ? overrides.target.slice(0, 240) : '',
    interaction: normalizeQuickAccessInteractionMode(overrides.interaction),
    openMode: normalizeQuickAccessOpenMode(overrides.openMode),
    icon: normalizeQuickAccessIcon(overrides.icon),
  };
}

export function createDefaultImportantItems(length = 4) {
  return Array.from({ length }, (_, index) => createQuickAccessItem(index, {
    id: `important-${index + 1}`,
    tone: importantItemTones[index % importantItemTones.length],
  }));
}

export function normalizeImportantTone(value, index = 0) {
  return importantItemTones.includes(value) ? value : importantItemTones[index % importantItemTones.length];
}

export function normalizeQuickAccessActionType(value) {
  return quickAccessActionTypes.includes(value) ? value : 'none';
}

export function normalizeQuickAccessInteractionMode(value) {
  return quickAccessInteractionModes.includes(value) ? value : 'open';
}

export function normalizeQuickAccessOpenMode(value) {
  return quickAccessOpenModes.includes(value) ? value : 'new-tab';
}

export function normalizeQuickAccessIcon(value) {
  return quickAccessIconOptions.some((option) => option.value === value) ? value : 'auto';
}

export function normalizeImportantItem(value = {}, index = 0) {
  return createQuickAccessItem(index, value);
}

export function normalizeImportantItems(value = [], options = {}) {
  const items = Array.isArray(value) ? value : [];

  if (items.length === 0 && options.fallbackCount) {
    return createDefaultImportantItems(options.fallbackCount);
  }

  return items.map((item, index) => normalizeImportantItem(item, index));
}

export function cleanImportantValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeQuickAccessUrl(value) {
  const normalizedValue = cleanImportantValue(value);

  if (!normalizedValue) {
    return '';
  }

  return /^https?:\/\//i.test(normalizedValue) ? normalizedValue : `https://${normalizedValue}`;
}

export function buildEndpointShortcutUrl(slug) {
  return `${window.location.origin}/hook/${slug}`;
}

export function isQuickAccessConfigured(item) {
  const label = cleanImportantValue(item?.label);
  const detail = cleanImportantValue(item?.detail);
  const target = cleanImportantValue(item?.target);

  if (item?.actionType === 'url') {
    return Boolean(label || detail || target);
  }

  if (item?.actionType && item.actionType !== 'none') {
    return true;
  }

  return Boolean(label || detail);
}

export function getQuickAccessMeta(item, endpoints, selectedEndpoint) {
  switch (item?.actionType) {
    case 'dashboard':
      return {
        label: 'Workspace overview',
        detail: 'Jump to the dashboard and recent activity.',
        icon: LayoutDashboard,
        actionable: true,
      };
    case 'create':
      return {
        label: 'Create route',
        detail: 'Open the endpoint creation flow instantly.',
        icon: Plus,
        actionable: true,
      };
    case 'workspace-settings':
      return {
        label: 'Workspace settings',
        detail: 'Open interface and sidebar controls.',
        icon: Settings2,
        actionable: true,
      };
    case 'selected-endpoint':
      return selectedEndpoint
        ? {
          label: selectedEndpoint.name || selectedEndpoint.slug,
          detail: item?.interaction === 'copy'
            ? `Copy ${buildEndpointShortcutUrl(selectedEndpoint.slug)}`
            : `/hook/${selectedEndpoint.slug}`,
          icon: item?.interaction === 'copy' ? Copy : Webhook,
          actionable: true,
          copyValue: buildEndpointShortcutUrl(selectedEndpoint.slug),
        }
        : {
          label: 'Current endpoint',
          detail: 'Open an endpoint first to use this shortcut.',
          icon: Webhook,
          actionable: false,
        };
    case 'response-studio':
      return selectedEndpoint
        ? {
          label: 'Response studio',
          detail: `Manage ${selectedEndpoint.name || selectedEndpoint.slug}`,
          icon: ShieldCheck,
          actionable: true,
        }
        : {
          label: 'Response studio',
          detail: 'Select an endpoint before using this shortcut.',
          icon: ShieldCheck,
          actionable: false,
        };
    case 'endpoint': {
      const targetEndpoint = endpoints.find((endpoint) => String(endpoint.id) === String(item?.target) || endpoint.slug === item?.target);

      return targetEndpoint
        ? {
          label: targetEndpoint.name || targetEndpoint.slug,
          detail: item?.interaction === 'copy'
            ? `Copy ${buildEndpointShortcutUrl(targetEndpoint.slug)}`
            : `/hook/${targetEndpoint.slug}`,
          icon: item?.interaction === 'copy' ? Copy : Webhook,
          actionable: true,
          endpoint: targetEndpoint,
          copyValue: buildEndpointShortcutUrl(targetEndpoint.slug),
        }
        : {
          label: 'Specific endpoint',
          detail: 'Choose an endpoint to make this shortcut work.',
          icon: Webhook,
          actionable: false,
        };
    }
    case 'url': {
      const normalizedUrl = normalizeQuickAccessUrl(item?.target);

      return {
        label: normalizedUrl || 'External URL',
        detail: normalizedUrl
          ? item?.interaction === 'copy'
            ? `Copy ${normalizedUrl}`
            : item?.openMode === 'same-tab'
              ? `Open ${normalizedUrl} in this tab`
              : `Open ${normalizedUrl} in a new tab`
          : 'Add a URL to make this shortcut work.',
        icon: item?.interaction === 'copy' ? Copy : ArrowUpRight,
        actionable: Boolean(normalizedUrl),
        copyValue: normalizedUrl,
        external: true,
        href: normalizedUrl,
      };
    }
    default:
      return {
        label: 'Pinned note',
        detail: 'Reference only',
        icon: Bookmark,
        actionable: false,
      };
  }
}

export function getQuickAccessIcon(iconName, fallbackIcon = Bookmark) {
  const normalizedIcon = normalizeQuickAccessIcon(iconName);

  if (normalizedIcon === 'auto') {
    return fallbackIcon;
  }

  return quickAccessIconOptions.find((option) => option.value === normalizedIcon)?.icon || fallbackIcon;
}
