// frontend/src/config/glassBrittleAreas.ts
//
// A185's Glass and Brittle Check register, transcribed from
//   docs/59) CFPLB.C4.F59 Glass and Brittle Check Record.pdf
// Nine area sheets, each listing the same four item types.
//
// Transcription notes — the source PDF has separator and duplication slips that
// are corrected or kept deliberately:
//   * A full stop standing in for a comma between two IDs is read as a comma
//     ("GL39.GL40" → "GL39, GL40", "T109.T109", "BGL24.BGL25", "T242.T244" …),
//     since the alternative is an ID that doesn't exist.
//   * "BGLBGL19" → "BGL19" and "T,24" → "T24" (doubled prefix / stray comma).
//   * Genuine repeats in the document are LEFT AS WRITTEN, because they may be
//     two physical fittings sharing a label: T14 twice (Security cabin),
//     GL15 twice (Packaging), T63 twice (Pantry), T141 twice (Mezzanine),
//     T187/T188 twice (Printing), GL57/GL58 twice (Production).
//   * Blank cells in the source stay blank: Glass Brittle on Storage area,
//     Brittle Glass (Acrylic) on Mezzanine floor and Lab.
//   * Page 7's Brittle Glass list runs onto page 8 and is joined here.
//   * "Gound floor" is the document's spelling of "Ground floor".

export interface GlassBrittleSeedRow {
  item: string;
  glassNo: string;
}

export interface GlassBrittleArea {
  /** Sheet heading — "Area" on the first sheet, "Floor" on the rest. */
  area: string;
  rows: GlassBrittleSeedRow[];
}

export const GLASS_ITEM_TYPES = [
  "Glass Brittle",
  "Brittle Glass (Acrylic)",
  "Tubelights",
  "Flycatcher/Fly killer",
];

export const A185_GLASS_AREAS: GlassBrittleArea[] = [
  {
    area: "Security cabin and Dock area",
    rows: [
      { item: "Glass Brittle", glassNo: "GL1, GL2, GL44, GL48, GL52, GL53, GL54, GL55" },
      { item: "Brittle Glass (Acrylic)", glassNo: "-" },
      { item: "Tubelights", glassNo: "T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T14, T15, T16, T17, T18, T359, T360" },
      { item: "Flycatcher/Fly killer", glassNo: "FC18, FC03, FC01" },
    ],
  },
  {
    area: "Ground floor (Pantry area)",
    rows: [
      { item: "Glass Brittle", glassNo: "GL3, GL4, GL5, GL6" },
      { item: "Brittle Glass (Acrylic)", glassNo: "BGL1, BGL2, BGL3, BGL4, BGL5, BGL6, BGL7, BGL8, BGL9, BGL10, BGL11, BGL12, BGL13, BGL14, BGL15, BGL16, BGL17, BGL18, BGL19, BGL20, BGL21, BGL22, BGL23, BGL24, BGL25, BGL26, BGL27, BGL28" },
      { item: "Tubelights", glassNo: "T19, T20, T21, T22, T23, T24, T25, T26, T27, T28, T29, T30, T31, T32, T33, T34, T35, T36, T37, T38, T39, T40, T41, T42, T43, T44, T45, T46, T47, T48, T49, T50, T51, T52, T53, T54, T55, T56, T57, T58, T59, T60, T61, T62, T63, T63, T64, T65, T66, T67, T68, T69, T70, T71, T72, T73, T74, T75, T76, T77, T78, T79, T98, T99" },
      { item: "Flycatcher/Fly killer", glassNo: "FC03, FC02" },
    ],
  },
  {
    area: "Packaging floor, Office floor",
    rows: [
      { item: "Glass Brittle", glassNo: "GL7, GL8, GL9, GL10, GL11, GL12, GL13, GL14, GL15, GL15, GL16" },
      { item: "Brittle Glass (Acrylic)", glassNo: "BGL29, BGL30, BGL31, BGL32, BGL33, BGL34, BGL35, BGL36, BGL37, BGL38, BGL39, BGL40, BGL41, BGL42, BGL43, BGL44, BGL45, BGL46, BGL47, BGL48, BGL49, BGL50, BGL51" },
      { item: "Tubelights", glassNo: "T80, T81, T82, T83, T84, T85, T86, T87, T88, T89, T90, T91, T92, T93, T94, T95, T96, T97, T106, T107, T108, T109, T109, T110, T111, T112, T113, T114, T115, T165, T166, T167, T168, T169, T170, T171, T172, T173, T174, T175, T176, T177, T178, T179, T180, T181, T182, T192, T193, T195, T196, T197, T198, T199, T216, T217, T218, T219, T220, T222, T203, T204, T205, T233, T234, T235, T236, T237, T238, T242, T244, T245, T246, T247, T248, T249, T250, T251, T252, T253, T254" },
      { item: "Flycatcher/Fly killer", glassNo: "FC05, FC06, FC07, FC04" },
    ],
  },
  {
    area: "Storage area",
    rows: [
      { item: "Glass Brittle", glassNo: "" },
      { item: "Brittle Glass (Acrylic)", glassNo: "BGL184, BGL185, BGL186, BGL187, BGL188, BGL189, BGL190, BGL191, BGL192" },
      { item: "Tubelights", glassNo: "T198, T199, T200, T201, T202, T203, T204, T205, T206, T207, T208, T209, T307, T308, T309, T310, T311, T312, T313, T314, T223, T272, T273, T348, T315, T327, T328, T329, T330, T190, T191" },
      { item: "Flycatcher/Fly killer", glassNo: "FC08, FC09" },
    ],
  },
  {
    area: "Mezzanine floor",
    rows: [
      { item: "Glass Brittle", glassNo: "GL17, GL18, GL19, GL20, GL21, GL22, GL23, GL24" },
      { item: "Brittle Glass (Acrylic)", glassNo: "" },
      { item: "Tubelights", glassNo: "T120, T122, T123, T124, T125, T126, T127, T128, T129, T130, T131, T132, T133, T134, T137, T138, T139, T140, T141, T141, T143, T144, T145, T146, T147, T148, T149, T150, T151, T152, T153, T154, T155, T156, T157, T158, T59, T160, T161, T162, T163, T164, T232" },
      { item: "Flycatcher/Fly killer", glassNo: "FC12, FC10" },
    ],
  },
  {
    area: "Printing and garbage area",
    rows: [
      { item: "Glass Brittle", glassNo: "GL25, GL26, GL27, GL56" },
      { item: "Brittle Glass (Acrylic)", glassNo: "BGL182, BGL183" },
      { item: "Tubelights", glassNo: "T100, T101, T102, T103, T183, T184, T185, T186, T187, T188, T187, T188, T189, T190, T191, T192, T193, T194, T195, T196, T197, T189, T201, T202, T358" },
      { item: "Flycatcher/Fly killer", glassNo: "FC11, FC14" },
    ],
  },
  {
    area: "Production floor",
    rows: [
      { item: "Glass Brittle", glassNo: "GL28, GL29, GL41, GL42, GL43, GL74, GL50, GL51, GL52, GL53, GL54, GL55, GL56, GL57, GL58, GL57, GL58, GL59, GL57" },
      { item: "Brittle Glass (Acrylic)", glassNo: "BGL52, BGL53, BGL54, BGL55, BGL56, BGL57, BGL58, BGL59, BGL60, BGL61, BGL62, BGL63, BGL64, BGL65, BGL66, BGL67, BGL68, BGL69, BGL70, BGL71, BGL72, BGL73, BGL74, BGL75, BGL76, BGL78, BGL80, BGL81, BGL82, BGL83, BGL84, BGL85, BGL86, BGL87, BGL88, BGL89, BGL90, BGL91, BGL92, BGL93, BGL94, BGL95, BGL96, BGL97, BGL98, BGL99, BGL100, BGL101, BGL102, BGL103, BGL104, BGL105, BGL106, BGL107, BGL18, BGL109, BGL110, BGL111, BGL112, BGL113, BGL114, BGL115, BGL116, BGL117, BGL118, BGL119, BGL120, BGL121, BGL122, BGL123, BGL124, BGL125, BGL126, BGL127, BGL128, BGL129, BGL130, BGL131, BGL132, BGL133, BGL134, BGL135, BGL136, BGL137, BGL138, BGL139, BGL140, BGL141, BGL142, BGL143, BGL144, BGL145, BGL146, BGL147, BGL148, BGL149, BGL150, BGL151, BGL152, BGL153, BGL154, BGL155, BGL156, BGL157, BGL158, BGL159, BGL160, BGL161, BGL162, BGL163, BGL164, BGL165, BGL166, BGL167, BGL168, BGL169, BGL170, BGL171, BGL172, BGL173, BGL174, BGL175, BGL176, BGL177, BGL178, BGL179, BGL180, BGL181" },
      { item: "Tubelights", glassNo: "T104, T105, T219, T220, T221, T222, T223, T224, T225, T226, T227, T228, T229, T230, T231, T232, T233, T234, T235, T236, T237, T238, T239, T240, T241, T242, T243, T244, T245, T246, T247, T248, T249, T250, T251, T252, T253, T254, T255, T256, T257, T258, T259, T260, T261, T262, T263, T264, T265, T266, T267, T268, T269, T270, T271, T272, T273, T274, T275, T276, T277, T278, T279, T280, T281, T282, T283, T284, T285, T286, T287, T288, T289, T290, T291, T292, T293, T294, T295, T296, T297, T298, T299, T300, T301, T302, T303, T304, T305, T306, T224, T225, T226, T227, T228, T229, T230, T231, T206, T207, T208, T209, T210, T264, T265, T266, T267, T268, T269, T331, T332, T333, T334, T335, T336, T349, T350, T351, T352, T353, T354, T355, T356, T357" },
      { item: "Flycatcher/Fly killer", glassNo: "FC13, FC16, FC19, FC17" },
    ],
  },
  {
    area: "Lab",
    rows: [
      { item: "Glass Brittle", glassNo: "GL30, GL31, GL32, GL33, GL34, GL35, GL36, GL37, GL38, GL39, GL40" },
      { item: "Brittle Glass (Acrylic)", glassNo: "" },
      { item: "Tubelights", glassNo: "T210, T211, T212, T213, T214, T215, T216, T217, T218" },
      { item: "Flycatcher/Fly killer", glassNo: "FC15" },
    ],
  },
];

export const A185_GLASS_AREA_NAMES = A185_GLASS_AREAS.map((a) => a.area);
