import { XMLParser } from 'fast-xml-parser';

export interface ScormManifest {
  title: string;
  version: string;
  entryPoint: string;
  identifier: string;
  organizations: ScormOrganization[];
  resources: ScormResource[];
}

export interface ScormOrganization {
  identifier: string;
  title: string;
  items: ScormItem[];
}

export interface ScormItem {
  identifier: string;
  identifierref: string;
  title: string;
}

export interface ScormResource {
  identifier: string;
  type: string;
  scormType: string; // 'sco' | 'asset'
  href: string;
  files: string[];
}

export function parseManifest(xmlContent: string): ScormManifest {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['item', 'resource', 'file', 'organization'].includes(name),
  });

  const parsed = parser.parse(xmlContent);
  const manifest = parsed.manifest;

  if (!manifest) throw new Error('Invalid imsmanifest.xml: missing <manifest> root');

  // Version
  const schemaVersion =
    manifest.metadata?.schemaversion ||
    manifest.metadata?.['adlcp:location'] ||
    '1.2';
  const version = String(schemaVersion).includes('2004') ? '2004' : '1.2';

  // Organizations
  const orgsRoot = manifest.organizations;
  const defaultOrg = orgsRoot?.['@_default'] || '';
  const orgArray: any[] = Array.isArray(orgsRoot?.organization)
    ? orgsRoot.organization
    : orgsRoot?.organization
    ? [orgsRoot.organization]
    : [];

  const organizations: ScormOrganization[] = orgArray.map((org: any) => ({
    identifier: org['@_identifier'] || '',
    title: org.title || '',
    items: (org.item || []).map((item: any) => ({
      identifier: item['@_identifier'] || '',
      identifierref: item['@_identifierref'] || '',
      title: item.title || '',
    })),
  }));

  // Resources
  const resRoot = manifest.resources;
  const resArray: any[] = Array.isArray(resRoot?.resource)
    ? resRoot.resource
    : resRoot?.resource
    ? [resRoot.resource]
    : [];

  const resources: ScormResource[] = resArray.map((res: any) => ({
    identifier: res['@_identifier'] || '',
    type: res['@_type'] || '',
    scormType:
      res['@_adlcp:scormtype'] ||
      res['@_adlcp:scormType'] ||
      res['@_scormtype'] ||
      'asset',
    href: res['@_href'] || '',
    files: (res.file || []).map((f: any) =>
      typeof f === 'string' ? f : f['@_href'] || ''
    ),
  }));

  // Entry point — first SCO resource href
  const sco = resources.find(
    (r) => r.scormType.toLowerCase() === 'sco' && r.href
  );
  const entryPoint = sco?.href || resources.find((r) => r.href)?.href || 'index.html';

  // Title — from default org or first org
  const defaultOrgData =
    organizations.find((o) => o.identifier === defaultOrg) || organizations[0];
  const title = defaultOrgData?.title || 'Untitled Course';

  return {
    title,
    version,
    entryPoint,
    identifier: manifest['@_identifier'] || '',
    organizations,
    resources,
  };
}
