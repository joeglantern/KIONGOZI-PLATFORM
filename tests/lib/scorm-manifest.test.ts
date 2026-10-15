import { describe, expect, it } from 'vitest';
import { parseManifest } from '@/lib/scorm/manifest-parser';

const scorm12 = `<?xml version="1.0"?>
<manifest identifier="pkg12" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="org1">
    <organization identifier="org1"><title>Climate Basics</title>
      <item identifier="i1" identifierref="r1"><title>Intro</title></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="r1" type="webcontent" adlcp:scormtype="sco" href="index_lms.html"><file href="index_lms.html"/></resource>
  </resources>
</manifest>`;

const scorm2004Cam = `<?xml version="1.0"?>
<manifest identifier="pkg2004" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3">
  <metadata><schema>ADL SCORM</schema><schemaversion>CAM 1.3</schemaversion></metadata>
  <organizations default="o"><organization identifier="o"><title>Civic Leadership</title>
    <item identifier="i" identifierref="r"><title>Module</title></item></organization></organizations>
  <resources><resource identifier="r" type="webcontent" adlcp:scormType="sco" href="story.html"/></resources>
</manifest>`;

describe('parseManifest', () => {
    it('reads a SCORM 1.2 package', () => {
        const m = parseManifest(scorm12);
        expect(m.version).toBe('1.2');
        expect(m.title).toBe('Climate Basics');
        expect(m.entryPoint).toBe('index_lms.html');
    });

    it('detects SCORM 2004 when schemaversion is "CAM 1.3"', () => {
        const m = parseManifest(scorm2004Cam);
        expect(m.version).toBe('2004');
        expect(m.title).toBe('Civic Leadership');
        expect(m.entryPoint).toBe('story.html');
    });

    it('detects SCORM 2004 editions by name', () => {
        const m = parseManifest(scorm2004Cam.replace('CAM 1.3', '2004 4th Edition'));
        expect(m.version).toBe('2004');
    });

    it('rejects XML without a manifest root', () => {
        expect(() => parseManifest('<foo/>')).toThrow();
    });
});
