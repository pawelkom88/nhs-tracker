import { hospitalSiteId, reportingUnitId } from '@kyw/model/ids';
import type { HospitalSite } from '@kyw/model/reference';
import { toDisplayName } from '../names.js';

interface RawWalesSiteData {
  readonly code: string;
  readonly name: string;
  readonly town: string;
  readonly boardOdsCode: string;
}

/**
 * Welsh NHS Hospital Sites by Health Board (ODS codes and names).
 *
 * Sourced from NHS ODS ORD entity registers and Health Board site listings.
 * Postcode fields are discarded; only official site code, name, and town are retained.
 *
 * @see GLOSSARY.md Hospital Site
 * @see ADR-0003
 */
const RAW_WALES_SITES: readonly RawWalesSiteData[] = [
  // 7A1: Betsi Cadwaladr University Local Health Board
  { code: '7A1A1', name: 'YSBYTY GWYNEDD', town: 'BANGOR', boardOdsCode: '7A1' },
  { code: '7A1A4', name: 'YSBYTY GLAN CLWYD', town: 'RHYL', boardOdsCode: '7A1' },
  { code: '7A1AU', name: 'WREXHAM MAELOR HOSPITAL', town: 'WREXHAM', boardOdsCode: '7A1' },
  { code: '7A1B1', name: 'YSBYTY ALLTWEN', town: 'PORTHMADOG', boardOdsCode: '7A1' },
  { code: '7A1B2', name: 'YSBYTY PENRHOS STANLEY', town: 'HOLYHEAD', boardOdsCode: '7A1' },
  { code: '7A1B3', name: 'COLWYN BAY COMMUNITY HOSPITAL', town: 'COLWYN BAY', boardOdsCode: '7A1' },
  { code: '7A1B4', name: 'DENBIGH COMMUNITY HOSPITAL', town: 'DENBIGH', boardOdsCode: '7A1' },
  { code: '7A1B5', name: 'MOLD COMMUNITY HOSPITAL', town: 'MOLD', boardOdsCode: '7A1' },
  { code: '7A1B6', name: 'HOLYWELL COMMUNITY HOSPITAL', town: 'HOLYWELL', boardOdsCode: '7A1' },
  { code: '7A1B7', name: 'RUTHIN COMMUNITY HOSPITAL', town: 'RUTHIN', boardOdsCode: '7A1' },
  {
    code: '7A1B8',
    name: 'DOLGELLAU AND BARMOUTH HOSPITAL',
    town: 'DOLGELLAU',
    boardOdsCode: '7A1',
  },
  { code: '7A1B9', name: 'TYWYN HOSPITAL', town: 'TYWYN', boardOdsCode: '7A1' },
  { code: '7A1C1', name: 'BRYN BERYL HOSPITAL', town: 'PWLLHELI', boardOdsCode: '7A1' },

  // 7A2: Hywel Dda University Local Health Board
  { code: '7A2A1', name: 'GLANGWILI GENERAL HOSPITAL', town: 'CARMARTHEN', boardOdsCode: '7A2' },
  { code: '7A2A2', name: 'WITHYBUSH GENERAL HOSPITAL', town: 'HAVERFORDWEST', boardOdsCode: '7A2' },
  { code: '7A2A3', name: 'BRONGLAIS GENERAL HOSPITAL', town: 'ABERYSTWYTH', boardOdsCode: '7A2' },
  { code: '7A2A4', name: 'PRINCE PHILIP HOSPITAL', town: 'LLANELLI', boardOdsCode: '7A2' },
  {
    code: '7A2B1',
    name: 'SOUTH PEMBROKESHIRE HOSPITAL',
    town: 'PEMBROKE DOCK',
    boardOdsCode: '7A2',
  },
  { code: '7A2B2', name: 'TENBY COTTAGE HOSPITAL', town: 'TENBY', boardOdsCode: '7A2' },
  { code: '7A2B3', name: 'AMMAN VALLEY HOSPITAL', town: 'AMMANFORD', boardOdsCode: '7A2' },

  // 7A3: Swansea Bay University Local Health Board
  { code: '7A3A1', name: 'MORRISTON HOSPITAL', town: 'SWANSEA', boardOdsCode: '7A3' },
  { code: '7A3A2', name: 'SINGLETON HOSPITAL', town: 'SWANSEA', boardOdsCode: '7A3' },
  { code: '7A3A3', name: 'NEATH PORT TALBOT HOSPITAL', town: 'PORT TALBOT', boardOdsCode: '7A3' },
  { code: '7A3B1', name: 'GORSEINON HOSPITAL', town: 'SWANSEA', boardOdsCode: '7A3' },

  // 7A4: Cardiff and Vale University Local Health Board
  { code: '7A4A1', name: 'UNIVERSITY HOSPITAL OF WALES', town: 'CARDIFF', boardOdsCode: '7A4' },
  { code: '7A4A2', name: 'UNIVERSITY HOSPITAL OF LLANDOUGH', town: 'PENARTH', boardOdsCode: '7A4' },
  { code: '7A4B1', name: 'BARRY HOSPITAL', town: 'BARRY', boardOdsCode: '7A4' },
  { code: '7A4B2', name: 'ST DAVIDS HOSPITAL', town: 'CARDIFF', boardOdsCode: '7A4' },
  { code: '7A4B3', name: 'CARDIFF ROYAL INFIRMARY', town: 'CARDIFF', boardOdsCode: '7A4' },

  // 7A5: Cwm Taf Morgannwg University Local Health Board
  { code: '7A5A1', name: 'ROYAL GLAMORGAN HOSPITAL', town: 'LLANTRISANT', boardOdsCode: '7A5' },
  { code: '7A5A2', name: 'PRINCE CHARLES HOSPITAL', town: 'MERTHYR TYDFIL', boardOdsCode: '7A5' },
  { code: '7A5A3', name: 'PRINCESS OF WALES HOSPITAL', town: 'BRIDGEND', boardOdsCode: '7A5' },
  { code: '7A5B1', name: 'YSBYTY CWM RHONDDA', town: 'LLWYN-Y-PIA', boardOdsCode: '7A5' },
  { code: '7A5B2', name: 'YSBYTY CWM CYNON', town: 'MOUNTAIN ASH', boardOdsCode: '7A5' },
  { code: '7A5B3', name: 'MAESTEG COMMUNITY HOSPITAL', town: 'MAESTEG', boardOdsCode: '7A5' },
  { code: '7A5B4', name: 'YSBYTY GEORGE THOMAS', town: 'TREORCHY', boardOdsCode: '7A5' },

  // 7A6: Aneurin Bevan University Local Health Board
  { code: '7A6A1', name: 'THE GRANGE UNIVERSITY HOSPITAL', town: 'CWMBRAN', boardOdsCode: '7A6' },
  { code: '7A6A2', name: 'ROYAL GWENT HOSPITAL', town: 'NEWPORT', boardOdsCode: '7A6' },
  { code: '7A6A3', name: 'NEVILL HALL HOSPITAL', town: 'ABERGAVENNY', boardOdsCode: '7A6' },
  { code: '7A6B1', name: 'YSBYTY YSTRAD FAWR', town: 'YSTRAD MYNACH', boardOdsCode: '7A6' },
  { code: '7A6B2', name: 'YSBYTY ANEURIN BEVAN', town: 'EBBW VALE', boardOdsCode: '7A6' },
  { code: '7A6B3', name: 'CHEPSTOW COMMUNITY HOSPITAL', town: 'CHEPSTOW', boardOdsCode: '7A6' },
  { code: '7A6B4', name: 'COUNTY HOSPITAL', town: 'GRIFFITHSTOWN', boardOdsCode: '7A6' },
  { code: '7A6B5', name: 'ST WOOLOS HOSPITAL', town: 'NEWPORT', boardOdsCode: '7A6' },

  // 7A7: Powys Teaching Local Health Board
  { code: '7A7A1', name: 'BRECON WAR MEMORIAL HOSPITAL', town: 'BRECON', boardOdsCode: '7A7' },
  {
    code: '7A7A2',
    name: 'LLANDRINDOD WELLS MEMORIAL HOSPITAL',
    town: 'LLANDRINDOD WELLS',
    boardOdsCode: '7A7',
  },
  { code: '7A7A3', name: 'VICTORIA MEMORIAL HOSPITAL', town: 'WELSHPOOL', boardOdsCode: '7A7' },
  {
    code: '7A7A4',
    name: 'LLANIDLOES WAR MEMORIAL HOSPITAL',
    town: 'LLANIDLOES',
    boardOdsCode: '7A7',
  },
  { code: '7A7A5', name: 'MONTGOMERY COUNTY INFIRMARY', town: 'NEWTOWN', boardOdsCode: '7A7' },
  {
    code: '7A7A6',
    name: 'YSTRADGYNLAIS COMMUNITY HOSPITAL',
    town: 'YSTRADGYNLAIS',
    boardOdsCode: '7A7',
  },
  { code: '7A7A7', name: 'BRONLLYS HOSPITAL', town: 'BRECON', boardOdsCode: '7A7' },
  { code: '7A7A8', name: 'KNIGHTON COMMUNITY HOSPITAL', town: 'KNIGHTON', boardOdsCode: '7A7' },
] as const;

/**
 * Builds the complete list of Hospital Sites for Wales.
 */
export function buildWalesHospitalSites(): HospitalSite<'wales'>[] {
  return RAW_WALES_SITES.map((site) => ({
    id: hospitalSiteId('wales', site.code),
    officialCode: site.code,
    name: toDisplayName(site.name),
    town: site.town ? toDisplayName(site.town) : null,
    reportingUnit: reportingUnitId('wales', site.boardOdsCode),
  })).sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
}

/**
 * Returns Hospital Sites belonging to a given Health Board ODS code.
 */
export function getWalesHospitalSitesForBoard(boardOdsCode: string): HospitalSite<'wales'>[] {
  const cleanCode = boardOdsCode.startsWith('wales:')
    ? boardOdsCode.slice('wales:'.length)
    : boardOdsCode;

  return RAW_WALES_SITES.filter((site) => site.boardOdsCode === cleanCode)
    .map((site) => ({
      id: hospitalSiteId('wales', site.code),
      officialCode: site.code,
      name: toDisplayName(site.name),
      town: site.town ? toDisplayName(site.town) : null,
      reportingUnit: reportingUnitId('wales', site.boardOdsCode),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
}
