// ─── Mandals & RTO Offices ───────────────────────────────────────────────────
// export const MANDAL_RTO_MAP = {
//   Ainavilli: "Amalapuram",
//   Katrenikona: "Amalapuram",
//   Amalapuram: "Amalapuram",
//   Allavaram: "Amalapuram",
//   Ambajipeta: "Amalapuram",
//   IPolavaram: "Amalapuram",
//   Mummidivaram: "Amalapuram",
//   PGannavaram: "Amalapuram",
//   Mamidikuduru: "Amalapuram",
//   Uppalaguptam: "Amalapuram",

//   Ravulapalem: "Ravulapalem",
//   Malikipuram: "Ravulapalem",
//   Sakhinetipalle: "Ravulapaleme",
//   Razole: "Ravulapalem",
//   Kothapeta: "Ravulapalem",
//   Atreyapuram: "Ravulapalem",

//   Alamuru: "Mandapeta",
//   Kapileswarapuram: "Mandapeta",
//   Mandapeta: "Mandapeta",

//   KGangavaram: "Ramachandrapuram",
//   Ramachandrapuram: "Ramachandrapuram",

// };

// export const MANDALS = Object.keys(MANDAL_RTO_MAP);

// ─── Vehicle Lanes ────────────────────────────────────────────────────────────
export const VEHICLE_LANES = [
  'AR_CAB_UP_TO_15Y',
  'AR_CAB_15Y_20Y',
  'AR_CAB_MORE_THAN_20Y',

  'LGV_LMV_UP_TO_15Y',
  'LGV_LMV_15Y_20Y',
  'LGV_LMV_MORE_THAN_20Y',

  'MGV_UP_TO_10Y',
  'MGV_10Y_13Y',
  'MGV_13Y_15Y',
  'MGV_15Y_20Y',
  'MGV_ABOVE_20Y',

  'HGV_HPV_UP_TO_10Y',
  'HGV_HPV_10Y_13Y',
  'HGV_HPV_13Y_15Y',
  'HGV_HPV_15Y_20Y',
  'HGV_HPV_ABOVE_20Y',
];

// ─── Lane Types ───────────────────────────────────────────────────────────────
export const LANE_TYPES = [
  '3T_AUTO_G',
  '3T_AUTO_P',
  '4T_MAXI_CAB',
  'BOLERO',
  'CAB_5_S',
  'CAB_7_S',
  'BUS_SCHOOL',
  'BUS_STATE',
  'BUS_RTC_G',
  'BUS_RTC_P',
  'BUS_TRVLR',
  'TAXI_CAR',
  'GOODS_VAN',
  'TIPPER_SMALL',
  'TIPPER_LARGE',
  'TRACTOR',
  'TRAILER_2_W',
  'TRAILER_3_W',
  'TRAILER_4W',
  'CRANE',
  'FIRE_ENGINE',
  'PICK_UP',
  'MINIBUS',
  'DUMPER',
  'LMV_PRIVATE',
  'MOTORCYCLE',
  'TEMPO_TRAVELLER',
  'LORRY_6_T',
  'LORRY_10T',
  'LORRY_12T',
  'LORRY_14T',
  'LORRY_16T',
  'Eicher',
  'MAXI_CAB_4T',
  'Maxi Cab 7'
];

// ─── Insurance Companies ──────────────────────────────────────────────────────
export const INSURANCE_COMPANIES = [
  'ACKO GENERAL INSURANCE',
  'BAJAJ ALLIANZ',
  'BHARTI AXA GENERAL INSURANCE',
  'CHOLA MS GENERAL INSURANCE',
  'DIGIT GENERAL INSURANCE',
  'FUTURE GENERALI',
  'GENERAL INSURANCE',
  'GO DIGIT GENERAL INSURANCE',
  'HDFC ERGO',
  'ICICI LOMBARD',
  'IFFCO TOKIO GENERAL INSURANCE',
  'KOTAK MAHINDRA GENERAL INSURANCE',
  'LIBERTY GENERAL INSURANCE',
  'MAGMA HDI GENERAL INSURANCE',
  'MARUTI SUZUKI',
  'NATIONAL INSURANCE',
  'NAVI GENERAL INSURANCE',
  'ORIENTAL INSURANCE',
  'RAHEJA QBE GENERAL INSURANCE',
  'RELIANCE GENERAL INSURANCE',
  'ROYAL SUNDARAM GENERAL INSURANCE',
  'SBI GENERAL INSURANCE',
  'SHRIRAM GENERAL INSURANCE',
  'TATA AIG',
  'THE NEW INDIA ASSURANCE',
  'TOTAL INSURANCE',
  'UNITED INDIA INSURANCE',
  'UNIVERSAL SOMPO GENERAL INSURANCE',
  'ZUNO GENERAL INSURANCE',
];

// ─── Test Types ───────────────────────────────────────────────────────────────
export const TEST_TYPES = ['First Test', 'Re-Test'];

// ─── Document Checklist Items ─────────────────────────────────────────────────
// id: unique key, label: display name, type: 'checkbox'|'checkbox_date'
// alwaysShow: if true, shown for all lane types
// onlyFor: array of lane types that need this item (null = all)
// notFor: array of lane types that do NOT need this item
export const DOC_CHECKLIST_ITEMS = [
  {
    id: 'test_date',
    label: 'Test Date',
    type: 'date_only',
    alwaysShow: true,
  },
  {
    id: 'test_type',
    label: 'Test Type',
    type: 'dropdown',
    alwaysShow: true,
    options: TEST_TYPES,
  },
  {
    id: 'afms_free_receipt',
    label: 'AFMS Free Receipt',
    type: 'checkbox',
    alwaysShow: true,
  },
  {
    id: 'rc',
    label: 'RC (Registration Certificate)',
    type: 'checkbox',
    alwaysShow: true,
  },
  {
    id: 'last_rc',
    label: 'Last FC (Fitness Certificate)',
    type: 'checkbox_date',
    alwaysShow: true,
    dateLabel: 'Expiry Date',
  },
  {
    id: 'puc',
    label: 'PUC (Pollution Under Control)',
    type: 'checkbox_date',
    alwaysShow: true,
    dateLabel: 'Expiry Date',
  },
  {
    id: 'insurance',
    label: 'Insurance',
    type: 'checkbox_date',
    alwaysShow: true,
    dateLabel: 'Expiry Date',
  },
  {
    id: 'insurance_company',
    label: 'Insurance Company Name',
    type: 'dropdown_search',
    alwaysShow: true,
  },
  {
    id: 'speed_governor',
    label: 'Speed Governor',
    type: 'checkbox',
    alwaysShow: false,
    notFor: ['3T_AUTO_G', '3T_AUTO_P', 'MOTORCYCLE', 'LMV_PRIVATE', 'TAXI_CAR'],
  },
  {
    id: 'vlt_device',
    label: 'VLT Device',
    type: 'checkbox',
    alwaysShow: false,
    onlyFor: ['AMBULANCE', 'BUS_SCHOOL', 'BUS_STATE', 'LORRY_10T', 'TIPPER_LARGE', 'TRAILER_2_W', 'TRAILER_3_W', 'CRANE', 'FIRE_ENGINE', 'DUMPER'],
  },
];

// ─── Visual Test Checklist Items ──────────────────────────────────────────────
/**
 * lib/config/visualChecklistItems.js
 *
 * Master Visual Checklist Items — sourced from ATS Konaseema Visual Checklist.
 * Existing items are untouched. Items missing from the original list
 * have been added from the Word document (items 09–28).
 *
 * alwaysShow: true  → shown for every vehicle type
 * alwaysShow: false → use onlyFor[] OR notFor[] to scope
 * onlyFor[]         → shown ONLY for these vehicle types
 * notFor[]          → shown for ALL types EXCEPT these
 */

export const VISUAL_CHECKLIST_ITEMS = [
  // ─── EXISTING ITEMS (untouched) ──────────────────────────────────────────

  {
    id: 'hsrp',
    label: 'High Security Registration Plate (HSRP)',
    alwaysShow: true,
    category: 'Exterior',
  },
  {
    id: 'head_lamps',
    label: 'Head Lamps Assembly',
    alwaysShow: true,
    category: 'Lights',
  },
  {
    id: 'head_lights_lr',
    label: 'Head Lights Left & Right Indicator Lights',
    alwaysShow: true,
    category: 'Lights',
  },
  {
    id: 'brake_lights',
    label: 'Brake Lights',
    alwaysShow: true,
    category: 'Lights',
  },
  {
    id: 'parking_indicator',
    label: 'Parking Indicator Lights (4)',
    alwaysShow: true,
    category: 'Lights',
  },
  {
    id: 'fog_lamps',
    label: 'Fog Lamps',
    alwaysShow: false,
    notFor: ['3T_AUTO_G', '3T_AUTO_P', 'MOTORCYCLE'],
    category: 'Lights',
  },
  {
    id: 'warning_light',
    label: 'Warning Light',
    alwaysShow: false,
    onlyFor: ['AMBULANCE', 'FIRE_ENGINE'],
    category: 'Lights',
  },
  {
    id: 'rear_view_mirror',
    label: 'Rear View Mirror',
    alwaysShow: true,
    category: 'Exterior',
  },
  {
    id: 'safety_glass',
    label: 'Safety Glasses (Windscreen)',
    alwaysShow: true,
    category: 'Exterior',
  },
  {
    id: 'horn',
    label: 'Horn',
    alwaysShow: true,
    category: 'Electrical',
  },
  {
    id: 'wiper_motor',
    label: 'Windscreen Wiper Motor & Blades',
    alwaysShow: false,
    notFor: ['3T_AUTO_G', '3T_AUTO_P', 'MOTORCYCLE'],
    category: 'Mechanical',
  },
  {
    id: 'fastag',
    label: 'FASTag',
    alwaysShow: true,
    category: 'Documents',
  },
  {
    id: 'steering',
    label: 'Steering Mechanism',
    alwaysShow: true,
    category: 'Mechanical',
  },
  {
    id: 'brake_system',
    label: 'Brake System',
    alwaysShow: true,
    category: 'Mechanical',
  },
  {
    id: 'exhaust',
    label: 'Exhaust System',
    alwaysShow: true,
    category: 'Mechanical',
  },
  {
    id: 'tyre_condition',
    label: 'Tyre Condition',
    alwaysShow: true,
    category: 'Mechanical',
  },
  {
    id: 'body_condition',
    label: 'Body / Cabin Condition',
    alwaysShow: true,
    category: 'Exterior',
  },
  {
    id: 'seat_belts',
    label: 'Seat Belts',
    alwaysShow: false,
    notFor: ['3T_AUTO_G', '3T_AUTO_P', 'MOTORCYCLE', 'TRACTOR'],
    category: 'Safety',
  },
  {
    id: 'fire_extinguisher',
    label: 'Fire Extinguisher',
    alwaysShow: false,
    onlyFor: ['AMBULANCE', 'BUS_SCHOOL', 'BUS_STATE', 'FIRE_ENGINE', 'LORRY_10T', 'TIPPER_LARGE'],
    category: 'Safety',
  },
  {
    id: 'first_aid_kit',
    label: 'First Aid Kit',
    alwaysShow: false,
    onlyFor: ['AMBULANCE', 'BUS_SCHOOL', 'BUS_STATE'],
    category: 'Safety',
  },

  // ─── NEW ITEMS (added from ATS Konaseema Visual Checklist doc) ───────────

  // Doc item 09 — Dashboard equipment
  {
    id: 'dashboard_equipment',
    label: 'Dashboard Equipment',
    alwaysShow: false,
    notFor: ['MOTORCYCLE', '3T_AUTO_G', '3T_AUTO_P'],
    category: 'Electrical',
  },

  // Doc item 10 — Speedometer
  {
    id: 'speedometer',
    label: 'Speedometer',
    alwaysShow: true,
    category: 'Electrical',
  },

  // Doc item 13 — Speed Governor
  // Applies to Transport Vehicle, Dumper/Tanker, School Bus, Airport Passenger.
  // N/A for Ambulance and Non-Transport vehicles.
  {
    id: 'speed_governor',
    label: 'Speed Governor',
    alwaysShow: false,
    onlyFor: [
      'BUS_SCHOOL', 'BUS_STATE', 'BUS_AIRPORT',
      'LORRY_10T', 'TIPPER_LARGE', 'TANKER',
    ],
    category: 'Mechanical',
  },

  // Doc item 14 — Lateral Under Run Protection Device
  {
    id: 'lupd',
    label: 'Lateral Under Run Protection Device (LUPD)',
    alwaysShow: false,
    onlyFor: [
      'LORRY_10T', 'TIPPER_LARGE', 'TANKER',
      'BUS_SCHOOL', 'BUS_STATE',
    ],
    category: 'Safety',
  },

  // Doc item 15 — Rear Under Run Protection Device
  {
    id: 'rupd',
    label: 'Rear Under Run Protection Device (RUPD)',
    alwaysShow: false,
    onlyFor: [
      'LORRY_10T', 'TIPPER_LARGE', 'TANKER',
      'BUS_SCHOOL', 'BUS_STATE',
    ],
    category: 'Safety',
  },

  // Doc item 16 — Spray Suppression Device
  {
    id: 'spray_suppression',
    label: 'Spray Suppression Device',
    alwaysShow: false,
    onlyFor: ['LORRY_10T', 'TIPPER_LARGE', 'TANKER'],
    category: 'Safety',
  },

  // Doc item 18 — Suppressor Cap / High Tension Cable
  {
    id: 'suppressor_cap',
    label: 'Suppressor Cap / High Tension Cable',
    alwaysShow: true,
    category: 'Electrical',
  },

  // Doc item 19 — Retro-Reflector and Reflective Tapes
  {
    id: 'retro_reflector',
    label: 'Retro-Reflector and Reflective Tapes',
    alwaysShow: true,
    category: 'Exterior',
  },

  // Doc item 20 — Battery
  {
    id: 'battery',
    label: 'Battery',
    alwaysShow: true,
    category: 'Electrical',
  },

  // Doc item 21 — Silencer
  {
    id: 'silencer',
    label: 'Silencer',
    alwaysShow: true,
    category: 'Mechanical',
  },

  // Doc item 22 — Priority Seats (buses only)
  {
    id: 'priority_seats',
    label: 'Priority Seats',
    alwaysShow: false,
    onlyFor: ['BUS_SCHOOL', 'BUS_STATE', 'BUS_AIRPORT'],
    category: 'Safety',
  },

  // Doc item 23 — Wheelchair Space & Signage (buses only)
  {
    id: 'wheelchair_space',
    label: 'Wheel Chair Space & Signage',
    alwaysShow: false,
    onlyFor: ['BUS_SCHOOL', 'BUS_STATE', 'BUS_AIRPORT'],
    category: 'Safety',
  },

  // Doc item 24 — Vehicle Location Tracking Device
  {
    id: 'vlt_device',
    label: 'Vehicle Location Tracking Device (VLT)',
    alwaysShow: false,
    onlyFor: [
      'BUS_SCHOOL', 'BUS_STATE', 'BUS_AIRPORT',
      'LORRY_10T', 'TIPPER_LARGE', 'TANKER', 'AMBULANCE',
    ],
    category: 'Electrical',
  },

  // Doc item 25 — Protection against Electric Shock (EVs only)
  {
    id: 'ev_shock_protection',
    label: 'Protection Against Electric Shock',
    alwaysShow: false,
    onlyFor: ['EV_CAR', 'EV_BUS', 'EV_AUTO', 'EV_MOTORCYCLE'],
    category: 'Safety',
  },

  // Doc item 26 — State of Charge (SOC) Indicator (EVs only)
  {
    id: 'soc_indicator',
    label: 'State of Charge (SOC) Indicator',
    alwaysShow: false,
    onlyFor: ['EV_CAR', 'EV_BUS', 'EV_AUTO', 'EV_MOTORCYCLE'],
    category: 'Electrical',
  },

  // Doc item 27 — Malfunction Indicator Lamp / OBD Scan Tool
  {
    id: 'mil_obd',
    label: 'Malfunction Indicator Lamp (MIL) / OBD Scan Tool',
    alwaysShow: true,
    category: 'Electrical',
  },

  // Doc item 28 — Joint Play Test
  {
    id: 'joint_play',
    label: 'Joint Play Test',
    alwaysShow: true,
    category: 'Mechanical',
  },
];

// ─── User Roles ───────────────────────────────────────────────────────────────
export const ROLES = {
  INSPECTOR: 'Inspector',
  SUPERVISOR: 'Supervisor',
  ADMIN: 'Admin',
};

// ─── Inspection Status ────────────────────────────────────────────────────────
export const INSPECTION_STATUS = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

// ─── Disclaimer ───────────────────────────────────────────────────────────────
export const DISCLAIMER_POINTS = [
  'This fitness certificate is valid for the vehicle tested on the date mentioned herein only.',
  'The vehicle owner is responsible for maintaining the vehicle in roadworthy condition at all times.',
  'This certificate does not exempt the vehicle from any other statutory requirements under the Motor Vehicles Act.',
  'Any misrepresentation of vehicle details or tampering with this certificate is a punishable offence.',
  'The Automated Vehicle Fitness Testing Station bears no liability for accidents caused after issuance of this certificate.',
];

// ─── Google Sheets Tab Names ──────────────────────────────────────────────────
export const SHEETS = {
  USERS: 'Users',
  VEHICLES: 'Vehicles',
  INSPECTIONS: 'Inspections',
  LANE_CONFIG: 'LaneConfig',
  INSURANCE_COMPANIES: 'InsuranceCompanies',
  STAFF: 'Staff',
  AGENTS: 'Agents',
  DEVICES: 'Devices',
  ANNOUNCEMENTS: 'Announcements',
  AUDIT_LOG: 'AuditLog',
  MANDALS: 'mandals',
  ALLOW_LIST: 'allowlist',
};