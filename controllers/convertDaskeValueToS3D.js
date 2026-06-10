const { create } = require("xmlbuilder2");
const path = require("path");
const fs = require("fs");
const {
  buildMacroInputFromCmkText,
  buildELINKSDocument,
} = require("../utils/macroElinksSerializer");
const {
  findClosestKantTraka,
  findMatNameForSifra,
  findSifraFromMaterialIfUnchecked,
} = require("../utils/kantTrakeUtils");

const DEFAULT_MACRO_FOLDER = "C:\\CorpusSoftware\\CorpusSolutions\\Makro";

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "da"].includes(normalized)) return true;
  if (["false", "0", "no", "ne"].includes(normalized)) return false;

  return fallback;
}

function normalizeBoardType(value) {
  const numeric = Number(value);
  if ([0, 1, 2, 4].includes(numeric)) {
    return String(numeric);
  }

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized) return "0";
  if (normalized.includes("front")) return "1";
  if (normalized.includes("polic") || normalized.includes("shelf")) return "2";
  if (
    normalized.includes("radna ploca") ||
    normalized.includes("worktop") ||
    normalized.includes("countertop")
  ) {
    return "4";
  }

  return "0";
}

function normalizeRotGod(value) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    if (numeric === 1) return "true";
    if (numeric === 0) return "false";
  }

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (["1", "true", "yes", "da", "y"].includes(normalized)) return "true";
  if (["0", "false", "no", "ne", "n", ""].includes(normalized)) return "false";

  return "false";
}

// Controller to convert JSON (userDaskeValues) to an .S3D file
const convertDaskeValueToS3D = (req, res) => {
  const userDaskeValues = req.body.userDaskeValues;
  //const pathToKantTrake = req.body.pathToKantTrake;
  //const userClientValues = req.body.userClientValues;
  const kantTrakeData = req.body.kantTrakeData;
  const checkedValue = normalizeBoolean(req.body.checkedValue, false);
  const checkedValueKT = normalizeBoolean(req.body.checkedValueKT, true);
  const macroFolderPath =
    req.body.macroFolderPath ||
    req.body.pathToMakrosFolder ||
    DEFAULT_MACRO_FOLDER;
  const macroFilesMap = req.body.macroFilesMap;
  const macroFileNames = req.body.macroFileNames;
  //console.log(kantTrakeData, userClientValues, "userClientValues");

  if (!userDaskeValues || !Array.isArray(userDaskeValues)) {
    console.error("Invalid userDaskeValues:", userDaskeValues);
    return res
      .status(400)
      .json({ message: "Invalid or missing userDaskeValues." });
  }
  if (!kantTrakeData || typeof kantTrakeData !== "object") {
    console.error("Invalid trakeData");
    return res.status(400).json({ message: "kantTrakeData is not an object." });
  }

  /* function findMatNameForSifra(filePath, sifra) {
    try {
      if (!sifra) {
        console.log("Sifra is undefined or empty");
        return null;
      }

      const fileContent = fs.readFileSync(filePath, "utf8");
      console.log(`Searching for Sifra: ${sifra} in file: ${filePath}`);

      // The regular expression matches the Data element with the given Sifra and extracts the MatName
      const regex = new RegExp(
        `<Data[^>]*Sifra="${sifra}"[^>]*MatName="([^"]+)"`,
        "i",
      );
      const match = fileContent.match(regex);

      if (match && match[1]) {
        const matName = match[1];
        console.log(`Found MatName: ${matName} for Sifra: ${sifra}`);
        return matName;
      } else {
        console.log(`No MatName found for Sifra: ${sifra}`);
        return null;
      }
    } catch (error) {
      console.error(`Error searching for Sifra in ${filePath}:`, error);
      return null;
    }
  } */
  try {
    const macroRuntime = createMacroRuntime(
      macroFolderPath,
      macroFilesMap,
      macroFileNames,
    );

    // Process the provided JSON data into our XML structure
    const xml = processDaskeData(
      userDaskeValues,
      kantTrakeData,
      macroRuntime,
      checkedValue,
      checkedValueKT,
    );

    const outputFileName = "outputFileName"; // You might derive this from your data
    const outputPath = saveAsS3DFile(xml, outputFileName);

    res.download(outputPath, `${outputFileName}.S3D`, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).json({ message: "Error occurred while sending file." });
      }
    });
  } catch (error) {
    console.error("Error processing data:", error);
    res.status(500).json({ message: "Error occurred while processing data." });
  }
};

// Function to process the JSON data and build the XML
function processDaskeData(
  userDaskeValues,
  kantTrakeData,
  macroRuntime,
  checkedValue,
  checkedValueKT,
) {
  let xmlContent = `<!-- Ver=16-->\r\n`;

  const xmlRoot = create().ele("PROJECTFILE", {
    FILE: "C:3DCorpus.S3D",
    VER: "16",
    THS: ",",
    DCS: ".",
    PRVNO: "100",
    SLAG: "1",
  });

  /*   let roomLength = 5;

  const totalLength = userDaskeValues.reduce(
    (sum, { width }) => sum + (+width || 0),
    0
  ); */

  // Room settings
  const sirina = 10; // meters
  const sirinaLimit = sirina * 1000; // convert to millimeters
  /*   if (totalLength / 1000 > roomLength) {
    roomLength = totalLength / 1000 + 1;
  } */

  xmlRoot.ele("SOBA", {
    SIRINA: "6",
    DUZINA: sirina.toString(),
    VISINA: "1.20000004768372",
    VISINALOW: "1.39999997615814",
    ZDT: "1458",
    ZGT: "1457",
    PT: "1456",
    ST: "1392",
    ZDNAME: "ZP_b66",
    ZGNAME: "ZP_b65",
    PNAME: "ZP_b64",
    SNAME: "ZP_b00",
  });

  xmlRoot.ele("SVJETLO", {
    AMB1: "0",
    LIH: "50",
    CAT: "25",
    LAT: "1",
    QAT: "1",
    SPCUT: "80",
    SPEXP: "100",
  });

  xmlRoot.ele("KAMERA", {
    CAMTYPE: "1",
    CAMEX: "0",
    CAMEY: "1.64999997615814",
    CAMEZ: "2.5",
    CAMCX: "0",
    CAMCY: "0",
    CAMCZ: "0",
    CAMUX: "0",
    CAMUY: "0",
    CAMUZ: "0",
    CAMLIN: "0",
    CAMA1X: "0",
    CAMA1Z: "0",
    CAMAX: "0",
    CAMAY: "1.64999997615814",
    CAMAZ: "2",
    CAMAA: "0",
    CAMAAX: "15",
    CAMDIS: "5",
    CAMKUTX: "180.100006103516",
    CAMKUTY: "-1",
    CAMOY: "1.64999997615814",
  });

  xmlRoot
    .ele("INFO")
    .txt(
      "07105450726F6A6563744F706973446174610102000602555103EF380603646174111E4C27C810B9E54006036176610500000000000000000000060372616202000603627270120000000006046272726E120000000006046964776E120000000006036F706912000000000604706B757A0200060370696C020106047064696E110000000000B9E54000",
    );

  xmlRoot.ele("CREATOR", {
    ID: "0",
    USNAM: "",
    NAZIV: "",
    PREZ: "",
    OIB: "",
    ADRESA: "",
    GRAD: "",
    KONTAKT: "",
    TEL: "",
    MOB: "",
    EMAIL: "",
    RABAT: "0",
    MARZA: "0",
    TECAJ: "0",
    POJED: "",
    MJISP: "",
    VRK: "0",
    ZIRO: "",
    GRUPA: "",
    ZEMLJA: "",
    RABAT1: "0",
    RABAT2: "0",
    MARZA1: "0",
    MARZA2: "0",
  });

  xmlRoot.ele("PUTANJA", {
    PATHINT: "10",
    PATHSPU: "50",
    PATHMAXS: "10",
    PATHSEG: "300",
    PATHTOCKE:
      '&quot;PTOCKA=0&quot;,&quot;PTSTYLE=1&quot;,&quot;PTANMODE=1&quot;,&quot;PTSEGCOUNT=300&quot;,&quot;PTX=1&quot;,&quot;PTZ=1&quot;,&quot;PTDEPTH=0&quot;,&quot;PTCLEN=0&quot;,&quot;PTS=0&quot;,&quot;PTPR0=1.55999994277954&quot;,&quot;PTPR1=1&quot;,&quot;PTPR2=0&quot;,&quot;PTNE0=0.439999997615814&quot;,&quot;PTNE1=1&quot;,&quot;PTNE2=0&quot;,&quot;PTOCKA=1&quot;,&quot;PTSTYLE=1&quot;,&quot;PTANMODE=1&quot;,&quot;PTSEGCOUNT=300&quot;,&quot;PTX=1&quot;,&quot;PTZ=0&quot;,&quot;PTDEPTH=1&quot;,&quot;PTCLEN=0&quot;,&quot;PTS=0&quot;,&quot;PTPR0=0&quot;,&quot;PTPR1=1&quot;,&quot;PTPR2=0.439999997615814&quot;,&quot;PTNE0=0&quot;,&quot;PTNE1=1&quot;,&quot;PTNE2=1.55999994277954&quot;,&quot;PTOCKA=2&quot;,&quot;PTSTYLE=1&quot;,&quot;PTANMODE=1&quot;,&quot;PTSEGCOUNT=300&quot;,&quot;PTX=1&quot;,&quot;PTZ=1&quot;,&quot;PTDEPTH=2&quot;,&quot;PTCLEN=0&quot;,&quot;PTS=0&quot;,&quot;PTPR0=0.439999997615814&quot;,&quot;PTPR1=1&quot;,&quot;PTPR2=2&quot;,&quot;PTNE0=1.55999994277954&quot;,&quot;PTNE1=1&quot;,&quot;PTNE2=2&quot;,&quot;PTOCKA=3&quot;,&quot;PTSTYLE=1&quot;,&quot;PTANMODE=1&quot;,&quot;PTSEGCOUNT=300&quot;,&quot;PTX=1&quot;,&quot;PTZ=2&quot;,&quot;PTDEPTH=1&quot;,&quot;PTCLEN=0&quot;,&quot;PTS=0&quot;,&quot;PTPR0=2&quot;,&quot;PTPR1=1&quot;,&quot;PTPR2=1.55999994277954&quot;,&quot;PTNE0=2&quot;,&quot;PTNE1=1&quot;,&quot;PTNE2=0.439999997615814&quot;,"',
  });

  // Variables for positioning elements
  let cumulativeEXPOS = 0;
  let cumulativeEZPOS = 0;
  const rowIncrement = 300;
  let isFirstRow = true;
  let currentRowMaxWidth = 0;

  // Process each JSON item
  userDaskeValues.forEach((item) => {
    // Skip if required fields are missing
    if (!item.position || !item.board_name) return;

    // Parse numeric values
    const lengthVal = parseFloat(item.length) || 0;
    const widthVal = parseFloat(item.width) || 0;
    const thVal = item.th || "1";
    const pcVal = item.pc || "1";
    const boardType = normalizeBoardType(item.type_of_board);
    const rotGodValue = normalizeRotGod(
      item.god ?? item.ROTGOD ?? item.rotgod ?? item.smjer_god,
    );
    const matchedLength1 = findClosestKantTraka(
      kantTrakeData,
      item.kant_group_l_1,
    );
    const matchedLength2 = findClosestKantTraka(
      kantTrakeData,
      item.kant_group_l_2,
    );
    const matchedWidth1 = findClosestKantTraka(
      kantTrakeData,
      item.kant_group_w_1,
    );
    const matchedWidth2 = findClosestKantTraka(
      kantTrakeData,
      item.kant_group_w_2,
    );

    const exactMatchLength1 = matchedLength1?.original || "";
    const exactMatchLength2 = matchedLength2?.original || "";
    const exactMatchWidth1 = matchedWidth1?.original || "";
    const exactMatchWidth2 = matchedWidth2?.original || "";

    function fallbackFindMaterial(kantTrakeData, groupGuess, material) {
      let result = findSifraFromMaterialIfUnchecked(
        kantTrakeData,
        groupGuess,
        material
      );
      if (!result) {
        for (const list of Object.values(kantTrakeData)) {
          const match = list.find(
            (traka) =>
              traka.matName?.trim().toLowerCase() ===
              material?.trim().toLowerCase()
          );
          if (match) return match.matName;
        }
      }
      return result || material;
    }
    // Find material names based on provided sifre
    let exactMatchMathNameL1 = null;
    let exactMatchMathNameL2 = null;
    let exactMatchMathNameW1 = null;
    let exactMatchMathNameW2 = null;
    const checkedValueKantTrake = checkedValue;
    if (checkedValueKantTrake) {
      exactMatchMathNameL1 = findMatNameForSifra(kantTrakeData, item.l_mat_1);
      exactMatchMathNameL2 = findMatNameForSifra(kantTrakeData, item.l_mat_2);
      exactMatchMathNameW1 = findMatNameForSifra(kantTrakeData, item.w_mat_1);
      exactMatchMathNameW2 = findMatNameForSifra(kantTrakeData, item.w_mat_2);
    } else {
      // Get the ABS group based on thickness values
      const groupL1 = matchedLength1?.original;
      const groupL2 = matchedLength2?.original;
      const groupW1 = matchedWidth1?.original;
      const groupW2 = matchedWidth2?.original;

      exactMatchMathNameL1 = exactMatchLength1
        ? findMatNameForSifra(kantTrakeData, item.l_mat_1)
        : fallbackFindMaterial(kantTrakeData, groupL1, item.material);
      exactMatchMathNameL2 = exactMatchLength2
        ? findMatNameForSifra(kantTrakeData, item.l_mat_2)
        : fallbackFindMaterial(kantTrakeData, groupL2, item.material);
      exactMatchMathNameW1 = exactMatchWidth1
        ? findMatNameForSifra(kantTrakeData, item.w_mat_1)
        : fallbackFindMaterial(kantTrakeData, groupW1, item.material);
      exactMatchMathNameW2 = exactMatchWidth2
        ? findMatNameForSifra(kantTrakeData, item.w_mat_2)
        : fallbackFindMaterial(kantTrakeData, groupW2, item.material);
    }
    //console.log("item.material", item.material);

    console.log(
      "exactMatchLength1",
      exactMatchLength1 ? "true" : "false",
      "exactMatchLength2",
      exactMatchLength2 ? "true" : "false",
      "exactMatchWidth1",
      exactMatchWidth1 ? "true" : "false",
      "exactMatchWidth2",
      exactMatchWidth2 ? "true" : "false",
      "exactMatchMathNameW1",
      exactMatchMathNameW1,
      "exactMatchMathNameW2",
      exactMatchMathNameW2,
      "exactMatchMathNameL1",
      exactMatchMathNameL1,
      "exactMatchMathNameL2",
      exactMatchMathNameL2,
    );

    const requestedMacro = pickRequestedMacroName(item);
    const macroResolution = resolveMacroForBoard(requestedMacro, macroRuntime);
    const cncProgram =
      String(item.cnc_1 ?? "").trim() ||
      macroResolution.resolvedMacroFile ||
      "";

    const finalNote1 = String(item.note_1 ?? "").trim();
    const finalNote2 = appendNoteText(
      String(item.note_2 ?? "").trim(),
      macroResolution.note,
    );

    // Combine notes if provided
    let noteBoth = "";
    if (finalNote1 && finalNote2) {
      noteBoth = `&quot;${finalNote1}&quot;,&quot;${finalNote2}&quot;`;
    } else if (finalNote1) {
      noteBoth = `&quot;${finalNote1}&quot;`;
    } else if (finalNote2) {
      noteBoth = `&quot;${finalNote2}&quot;`;
    }

    // Update the current row's max width if needed
    if (widthVal > currentRowMaxWidth) {
      currentRowMaxWidth = widthVal;
    }

    // Calculate EXPOX and update cumulative value
    let expos = cumulativeEXPOS;
    cumulativeEXPOS += lengthVal;

    // Check if the current row exceeds the room width
    if (cumulativeEXPOS > sirinaLimit) {
      expos = 0;
      cumulativeEXPOS = lengthVal;
      cumulativeEZPOS += currentRowMaxWidth + rowIncrement;
      currentRowMaxWidth = 0;
      isFirstRow = false;
    }

    // Calculate EZPOS based on whether this is the first row
    let ezpos =
      isFirstRow ? widthVal : cumulativeEZPOS + widthVal + rowIncrement;

    // Create the ELEMENT node with all necessary attributes
    const element = xmlRoot.ele("ELEMENT", {
      ECLAS: "TElement",
      ELVL: "0",
      ERC: "309136",
      ENAME: item.position,
      EKUT: "0",
      EXPOX: expos.toString(),
      EYPOS: "0",
      EZPOS: ezpos.toString(),
      EVISINA: thVal,
      EDUBINA: widthVal.toString(),
      EDEBLJINA: "",
      ESIRINA: lengthVal.toString(),
      ETIPE: "2",
      EVISIBLE: "true",
      EIMPORTNAME: "",
      ECIJENA: "",
      EEDITABLE: "true",
      ELOCKED: "false",
      ECJCOUNT: "false",
      EXF: "",
      EYF: "",
      EZF: "",
      EHF: "",
      ESF: "",
      EDF: "",
      EKXF: "",
      EKYF: "",
      EKZF: "",
      EKOL: pcVal,
      EXKUT: "0",
      EZKUT: "0",
      EOPIS: "",
      ENAPOMENA: "",
      EARTIKL: "false",
      EMINV: "0",
      EMINS: "0",
      EMIND: "0",
      EMAXV: "0",
      EMAXS: "0",
      EMAXD: "0",
      EKORAKV: "1",
      EKORAKS: "1",
      EKORAKD: "1",
      EVKON: "true",
      ESKON: "true",
      EDKON: "true",
      ELOCKV: "false",
      ELOCKS: "false",
      ELOCKD: "false",
      ELOCKN: "false",
      ELPWD: "",
      ELLWPWD: "",
      ESOFS: "0",
      EDOFS: "0",
      EZID: "10008",
      EZIDIND: "0",
      ETIPIZCJ: "1",
      ECHIBRID: "false",
      ELOG: "CRP89;122;110;81;86;38;87;83;121;69;110;110;46;92;",
      ESIFRA: "%NE%",
      EDEFVIS: "0",
      EDEFDUB: "0",
      EDEFSIR: "0",
      EMODEL: "-1",
      EFIXM: "false",
      EDEMOON: "false",
      ESMKU: "0",
      ETIPKU: "0",
      EDPVE: "true",
      EDPVKUE: "true",
      EDPYE: "true",
      EPPUE: "0",
      EPVNS: "false",
      EIVNE: "100",
      EIDVR: "0",
      EEVENT: "OnChange=,OnInsert=,OnLoad=,OnSelect=,OnGetPrice=",
      EJPD: "true",
      EEZEV: "false",
      EANCH: "7",
      EPRINT: "true",
      EPRINTCH: "true",
      NETPRICERAB: "0",
      NETPRICEMAR: "0",
    });

    // Append SELBOX, EVAR and EFVK nodes
    element
      .ele("SELBOX")
      .txt(
        "070D5473656C656374696F6E426F780102000602555103F0380603707473000000000000000000000000000000000000000000F1380000F2380000F3380000F4380000F5380000F6380000F7380000F8380000F9380000FA380000FB380000FC380000FD380000FE380000FF38000000390000013900000239000003390000043900000539000000",
      );
    element.ele("EVAR", { VAR0: "" });
    const efvk = element.ele("EFVK", {
      EVARK0: "materijali,kom,1,CB_MatPrice,",
      EVARK1: "traka,kom,1,CB_EdgePrice,",
      EVARK2: "okovi,kom,1,CB_FitPrice,",
      EVARK3: "otpad,kom,0.2,CB_MatPrice,",
      EVARK4: "krojenje,kom,0.2,CB_MatPrice,",
      EVARK5: "&quot;spajanje elemenata&quot;,kom,1,30,",
      EVARK6: "&quot;montaza ladice&quot;,kom,CB_DrawQty,20,",
      EVARK7: "zarada,kom,1,2*(CB_MatPrice+CB_EdgePrice),",
    });
    efvk.ele("FVKVAR", {
      VAR0: "B=VISINA",
      VAR1: "L=ŠIRINA",
      VAR2: "D=DEBLJINA",
    });

    element.ele("SCMENU");
    element.ele("ACCGRP");

    // DASKE and AD with nested elements
    const daske = element.ele("DASKE", { DCOUNT: "1" });
    const ad = daske.ele("AD", {
      DNAME: item.board_name,
      ROTGOD: rotGodValue,
      DKUT: "0",
      DXPOS: "0",
      DYPOS: "0",
      DZPOS: "0",
      VISINA: lengthVal.toString(),
      DUBINA: widthVal.toString(),
      DEBLJINA: thVal,
      SMJER: "2",
      TIPDASKE: boardType,
      FIXTEX: "false",
      VISIBLE: "true",
      BOJA: "10066329",
      PROZIRNO: "false",
      TIPFRONTE: "0",
      XF: "",
      YF: "",
      ZF: "",
      HF: "",
      SF: "",
      DF: "",
      XKUT: "0",
      ZKUT: "0",
      TEXIND: "34",
      MATFOLDER: "",
      MATNAME: item.material,
      IGNOREGOD: "false",
      PRIMJEDBA: "",
      PROGRAM: cncProgram,
      KXF: "",
      KYF: "",
      KZF: "",
      ARTIKL: "false",
      DSIFRA: "%NE%",
      PROGRAM1: item.cnc_2,
      PRIMJEDBALIST: noteBoth,
      PRDEBLJINA: "0",
      INHFR: "false",
      RUNKOLICINA: "0",
      EIDVR: "0",
      PROIZVODISE: "0",
      DANCH: "7",
    });
    ad.ele("SELBOX").txt(
      "070D5473656C656374696F6E426F780102000602555103063906037074730000000000000000000000000000000000000000000739000008390000093900000A3900000B3900000C3900000D3900000E3900000F390000103900001139000012390000133900001439000015390000163900001739000018390000193900001A3900001B39000000",
    );
    const ignoreKantTrakeCompletly = checkedValueKT;
    console.log("ignoreKantTrakeCompletly", !ignoreKantTrakeCompletly);
    const hasGroupValue = (v) =>
      v !== undefined && v !== null && String(v).trim() !== "";

    console.log(hasGroupValue(item.kant_group_l_1));
    const potrosni = ad.ele("POTROSNI", { COUNT: "4" });
    console.log(
      "typeof exactMatchWidth1:",
      typeof exactMatchWidth1,
      "value:",
      exactMatchWidth1,
      typeof exactMatchMathNameW1 === "string",
      exactMatchMathNameW1
    );
    if (!ignoreKantTrakeCompletly) {
      if (
        typeof exactMatchWidth1 === "string" &&
        exactMatchWidth1.trim() !== "" &&
        typeof exactMatchMathNameW1 === "string" &&
        exactMatchMathNameW1.trim() !== ""
      ) {
        potrosni.ele("POTITEM", {
          TIP: "0",
          INDEX: "0",
          STR0: exactMatchWidth1 ? "true" : "false",
          STR1: "false",
          STR2: "false",
          STR3: "false",
          MATN: exactMatchMathNameW1,
          NAZIV: exactMatchWidth1,
          TIPD: "0",
        });
        potrosni.ele("DEFTRITEM", {
          INDEX: "0",
          STR0: exactMatchWidth1 ? "true" : "false",
          STR1: "false",
          STR2: "false",
          STR3: "false",
          MATN: exactMatchMathNameW1,
          NAZIV: exactMatchWidth1,
          TIPD: "0",
        });
      }
      if (
        typeof exactMatchWidth2 === "string" &&
        exactMatchWidth2.trim() !== "" &&
        typeof exactMatchMathNameW2 === "string" &&
        exactMatchMathNameW2.trim() !== ""
      ) {
        potrosni.ele("POTITEM", {
          TIP: "0",
          INDEX: "0",
          STR0: "false",
          STR1: exactMatchWidth2 ? "true" : "false",
          STR2: "false",
          STR3: "false",
          MATN: exactMatchMathNameW2,
          NAZIV: exactMatchWidth2,
          TIPD: "0",
        });
        potrosni.ele("DEFTRITEM", {
          INDEX: "0",
          STR0: "false",
          STR1: exactMatchWidth2 ? "true" : "false",
          STR2: "false",
          STR3: "false",
          MATN: exactMatchMathNameW2,
          NAZIV: exactMatchWidth2,
          TIPD: "0",
        });
      }
      if (
        typeof exactMatchLength1 === "string" &&
        exactMatchLength1.trim() !== "" &&
        typeof exactMatchMathNameL1 === "string" &&
        exactMatchMathNameL1.trim() !== ""
      ) {
        potrosni.ele("POTITEM", {
          TIP: "0",
          INDEX: "0",
          STR0: "false",
          STR1: "false",
          STR2: exactMatchLength1 ? "true" : "false",
          STR3: "false",
          MATN: exactMatchMathNameL1,
          NAZIV: exactMatchLength1,
          TIPD: "0",
        });
        potrosni.ele("DEFTRITEM", {
          INDEX: "0",
          STR0: "false",
          STR1: "false",
          STR2: exactMatchLength1 ? "true" : "false",
          STR3: "false",
          MATN: exactMatchMathNameL1,
          NAZIV: exactMatchLength1,
          TIPD: "0",
        });
      }
      if (
        typeof exactMatchLength2 === "string" &&
        exactMatchLength2.trim() !== "" &&
        typeof exactMatchMathNameL2 === "string" &&
        exactMatchMathNameL2.trim() !== ""
      ) {
        potrosni.ele("POTITEM", {
          TIP: "0",
          INDEX: "0",
          STR0: "false",
          STR1: "false",
          STR2: "false",
          STR3: exactMatchLength2 ? "true" : "false",
          MATN: exactMatchMathNameL2,
          NAZIV: exactMatchLength2,
          TIPD: "0",
        });
        potrosni.ele("DEFTRITEM", {
          INDEX: "0",
          STR0: "false",
          STR1: "false",
          STR2: "false",
          STR3: exactMatchLength2 ? "true" : "false",
          MATN: exactMatchMathNameL2,
          NAZIV: exactMatchLength2,
          TIPD: "0",
        });
      }
    } else {
      if (hasGroupValue(item.kant_group_w_1)) {
        potrosni.ele("POTITEM", {
          TIP: "0",
          INDEX: "0",
          STR0: "true",
          STR1: "false",
          STR2: "false",
          STR3: "false",
          MATN: item.material || "",
          NAZIV: "",
          TIPD: "0",
        });
        potrosni.ele("DEFTRITEM", {
          INDEX: "0",
          STR0: "true",
          STR1: "false",
          STR2: "false",
          STR3: "false",
          MATN: item.material || "",
          NAZIV: "",
          TIPD: "0",
        });
      }

      if (hasGroupValue(item.kant_group_w_2)) {
        potrosni.ele("POTITEM", {
          TIP: "0",
          INDEX: "0",
          STR0: "false",
          STR1: "true",
          STR2: "false",
          STR3: "false",
          MATN: item.material || "",
          NAZIV: "",
          TIPD: "0",
        });
        potrosni.ele("DEFTRITEM", {
          INDEX: "0",
          STR0: "false",
          STR1: "true",
          STR2: "false",
          STR3: "false",
          MATN: item.material || "",
          NAZIV: "",
          TIPD: "0",
        });
      }

      if (hasGroupValue(item.kant_group_l_1)) {
        potrosni.ele("POTITEM", {
          TIP: "0",
          INDEX: "0",
          STR0: "false",
          STR1: "false",
          STR2: "true",
          STR3: "false",
          MATN: item.material || "",
          NAZIV: "",
          TIPD: "0",
        });
        potrosni.ele("DEFTRITEM", {
          INDEX: "0",
          STR0: "false",
          STR1: "false",
          STR2: "true",
          STR3: "false",
          MATN: item.material || "",
          NAZIV: "",
          TIPD: "0",
        });
      }

      if (hasGroupValue(item.kant_group_l_2)) {
        potrosni.ele("POTITEM", {
          TIP: "0",
          INDEX: "0",
          STR0: "false",
          STR1: "false",
          STR2: "false",
          STR3: "true",
          MATN: item.material || "",
          NAZIV: "",
          TIPD: "0",
        });
        potrosni.ele("DEFTRITEM", {
          INDEX: "0",
          STR0: "false",
          STR1: "false",
          STR2: "false",
          STR3: "true",
          MATN: item.material || "",
          NAZIV: "",
          TIPD: "0",
        });
      }
    }

    if (macroResolution.elinksXml) {
      try {
        const elinksRoot = create(macroResolution.elinksXml).root();
        element.import(elinksRoot);
      } catch (error) {
        console.error(
          `Failed to import ELINKS for macro "${macroResolution.resolvedMacroFile}":`,
          error,
        );
      }
    }
  });

  // Append the PLANES element after processing all items
  xmlRoot
    .ele("PLANES")
    .txt(
      "071054506C616E65436F6C6C656374696F6E01020006025551031C390606706C616E6573020501070354425001020106025551031D39060364697200000000000000000000803F0000000006027570000000000000803F000000000000000006047368706C0706545348434F4C01020106025551031E3906057368636E74020101070C54536861706553717561726501020106025551031F390606707473636E74020401070F54536861706550617468506F696E74010201060255510320390605706B696E6402010603706F7300401CC50000000000401CC500070F54536861706550617468506F696E74010201060255510321390605706B696E6402010603706F7300401C450000000000401CC500070F54536861706550617468506F696E74010201060255510322390605706B696E6402010603706F7300401C450000000000401C4500070F54536861706550617468506F696E74010201060255510323390605706B696E6402010603706F7300401CC50000000000401C4500000605636F6C6F724694163FDB8A0D3FB072083F0000803F0603636C6F090603706F7300401C450000000000401C4506046364656C0806047069636B0906036E7063080602667705000000000000409C0B400602666805000000000000409C0B4000000006046B6F746C0709544B6F74614C6973740102010602555103243906056B74636E74020001000000070354425001020106025551032539060364697200000080000080BF00000080000000000602757000000000000000800000803F0000000006047368706C0706545348434F4C0102010602555103263906057368636E74020101070C545368617065537175617265010201060255510327390606707473636E74020401070F54536861706550617468506F696E74010201060255510328390605706B696E6402010603706F7300401CC5000000000080A2C400070F54536861706550617468506F696E74010201060255510329390605706B696E6402010603706F7300401C45000000000080A2C400070F54536861706550617468506F696E7401020106025551032A390605706B696E6402010603706F7300401C45000000000080A24400070F54536861706550617468506F696E7401020106025551032B390605706B696E6402010603706F7300401CC5000000000080A24400000605636F6C6F724694163FDB8A0D3FB072083F0000803F0603636C6F090603706F7300401C45000000000080A2C406046364656C0806047069636B0806036E7063080602667705000000000000409C0B40060266680500000000000080A20A4000000006046B6F746C0709544B6F74614C69737401020106025551032C3906056B74636E74020001000000070354425001020106025551032D39060364697200000080000080BF0000008000000000060275700000803F00000080000000800000000006047368706C0706545348434F4C01020106025551032E3906057368636E74020101070C54536861706553717561726501020106025551032F390606707473636E74020401070F54536861706550617468506F696E74010201060255510330390605706B696E6402010603706F7300401CC5000000000080A2C400070F54536861706550617468506F696E74010201060255510331390605706B696E6402010603706F7300401C45000000000080A2C400070F54536861706550617468506F696E74010201060255510332390605706B696E6402010603706F7300401C45000000000080A24400070F54536861706550617468506F696E74010201060255510333390605706B696E6402010603706F7300401CC5000000000080A24400000605636F6C6F724694163FDB8A0D3FB072083F0000803F0603636C6F090603706F7300401CC5000000000080A2C406046364656C0806047069636B0806036E7063080602667705000000000000409C0B40060266680500000000000080A20A4000000006046B6F746C0709544B6F74614C6973740102010602555103343906056B74636E74020001000000070354425001020106025551033539060364697200000080000080BF0000000000000000060275700000008000000080000080BF0000000006047368706C0706545348434F4C0102010602555103363906057368636E74020001000006046B6F746C0709544B6F74614C6973740102010602555103373906056B74636E74020001000000070354425001020106025551033839060364697200000080000080BF000000800000000006027570000080BF00000080000000800000000006047368706C0706545348434F4C0102010602555103393906057368636E74020001000006046B6F746C0709544B6F74614C69737401020106025551033A3906056B74636E740200010000000000",
    );

  const xmlString = xmlRoot.end({ prettyPrint: true, headless: true });
  xmlContent += xmlString;
  return xmlContent;
}

function normalizeMacroKey(value) {
  return String(value ?? "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .toLowerCase()
    .replace(/\.cmk$/i, "");
}

function appendNoteText(baseNote, extraNote) {
  const base = String(baseNote ?? "").trim();
  const extra = String(extraNote ?? "").trim();

  if (!base) return extra;
  if (!extra) return base;

  return `${base} | ${extra}`;
}

function pickRequestedMacroName(item) {
  const candidates = [item?.macro_cmk, item?.macro, item?.MACRO, item?.makro];

  for (const candidate of candidates) {
    const normalized = String(candidate ?? "").trim();
    if (normalized) return normalized;
  }

  return "";
}

function levenshteinDistance(a, b) {
  const source = String(a ?? "");
  const target = String(b ?? "");

  const matrix = Array.from({ length: source.length + 1 }, () =>
    new Array(target.length + 1).fill(0),
  );

  for (let i = 0; i <= source.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= target.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= source.length; i += 1) {
    for (let j = 1; j <= target.length; j += 1) {
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[source.length][target.length];
}

function findClosestMacroName(inputName, availableFiles) {
  const normalizedInput = normalizeMacroKey(inputName);
  let bestFile = "";
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const fileName of availableFiles) {
    const distance = levenshteinDistance(
      normalizedInput,
      normalizeMacroKey(fileName),
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      bestFile = fileName;
    }
  }

  return bestFile;
}

function createMacroRuntime(macroFolderPath, macroFilesMap, macroFileNames) {
  const runtime = {
    folderPath: String(macroFolderPath ?? "").trim() || DEFAULT_MACRO_FOLDER,
    files: [],
    byKey: new Map(),
    fileContentsByName: new Map(),
    parsedByFile: new Map(),
  };

  const incomingMacroFiles =
    (
      macroFilesMap &&
      typeof macroFilesMap === "object" &&
      !Array.isArray(macroFilesMap)
    ) ?
      Object.entries(macroFilesMap)
    : [];

  for (const [rawName, rawContent] of incomingMacroFiles) {
    if (typeof rawContent !== "string") continue;

    const normalizedName = String(rawName ?? "").trim();
    if (!normalizedName) continue;

    const fileName =
      /\.cmk$/i.test(normalizedName) ? normalizedName : `${normalizedName}.CMK`;

    runtime.fileContentsByName.set(fileName, rawContent);
  }

  const incomingMacroNames =
    Array.isArray(macroFileNames) ? macroFileNames : [];
  const seenMacroKeys = new Set();
  for (const rawName of incomingMacroNames) {
    const normalizedName = String(rawName ?? "").trim();
    if (!normalizedName) continue;

    const fileName =
      /\.cmk$/i.test(normalizedName) ? normalizedName : `${normalizedName}.CMK`;
    const normalizedKey = normalizeMacroKey(fileName);
    if (seenMacroKeys.has(normalizedKey)) continue;
    seenMacroKeys.add(normalizedKey);
    runtime.files.push(fileName);
  }

  if (runtime.fileContentsByName.size > 0) {
    for (const fileName of runtime.fileContentsByName.keys()) {
      const normalizedKey = normalizeMacroKey(fileName);
      if (seenMacroKeys.has(normalizedKey)) continue;
      seenMacroKeys.add(normalizedKey);
      runtime.files.push(fileName);
    }

    runtime.files.sort((a, b) => a.localeCompare(b));

    runtime.files.forEach((fileName) => {
      runtime.byKey.set(normalizeMacroKey(fileName), fileName);
    });

    return runtime;
  }

  if (runtime.files.length > 0) {
    runtime.files.sort((a, b) => a.localeCompare(b));
    runtime.files.forEach((fileName) => {
      runtime.byKey.set(normalizeMacroKey(fileName), fileName);
    });
  }

  try {
    if (!fs.existsSync(runtime.folderPath)) {
      return runtime;
    }

    runtime.files = fs
      .readdirSync(runtime.folderPath, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() && path.extname(entry.name).toLowerCase() === ".cmk",
      )
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    runtime.files.forEach((fileName) => {
      runtime.byKey.set(normalizeMacroKey(fileName), fileName);
    });
  } catch (error) {
    console.error("Failed to initialize macro runtime:", error);
  }

  return runtime;
}

function loadMacroElinksXml(fileName, macroRuntime) {
  if (!fileName) return "";

  const cacheKey = normalizeMacroKey(fileName);
  if (macroRuntime.parsedByFile.has(cacheKey)) {
    return macroRuntime.parsedByFile.get(cacheKey);
  }

  try {
    const fileContent =
      macroRuntime.fileContentsByName.get(fileName) ??
      fs.readFileSync(path.join(macroRuntime.folderPath, fileName), "utf8");
    const macroInput = buildMacroInputFromCmkText(fileContent, {
      macroName: path.parse(fileName).name || "X_CONNECTION_TYPE",
    });
    const elinksXml = buildELINKSDocument(macroInput);
    macroRuntime.parsedByFile.set(cacheKey, elinksXml);
    return elinksXml;
  } catch (error) {
    console.error(`Failed to read/serialize macro "${fileName}":`, error);
    return "";
  }
}

function resolveMacroForBoard(requestedMacro, macroRuntime) {
  const selected = String(requestedMacro ?? "").trim();
  if (!selected) {
    return {
      resolvedMacroFile: "",
      elinksXml: "",
      note: "",
    };
  }

  if (macroRuntime.files.length === 0) {
    return {
      resolvedMacroFile: "",
      elinksXml: "",
      note: `Macro "${selected}" was provided, but no .CMK files were found in "${macroRuntime.folderPath}".`,
    };
  }

  const exactFile = macroRuntime.byKey.get(normalizeMacroKey(selected));
  if (exactFile) {
    return {
      resolvedMacroFile: exactFile,
      elinksXml: loadMacroElinksXml(exactFile, macroRuntime),
      note: "",
    };
  }

  const closest = findClosestMacroName(selected, macroRuntime.files);
  return {
    resolvedMacroFile: "",
    elinksXml: "",
    note:
      closest ?
        `Macro "${selected}" not found. Closest available macro is "${closest}".`
      : `Macro "${selected}" not found in "${macroRuntime.folderPath}".`,
  };
}

function normalizeC6DatAttributeLineBreaks(xml) {
  return String(xml ?? "").replace(/C6DAT="([^"]*)"/gs, (_match, value) => {
    const normalized = String(value)
      .replace(/\r\n/g, "\n")
      .replace(/\n/g, "&#xA;");
    return `C6DAT="${normalized}"`;
  });
}

// Helper: Find material name for a given sifra in the Kant Trake file
/* function findMatNameForSifra(kantTrakeData, sifra) {
  if (!sifra || !kantTrakeData) return null;

  for (const fileKey in kantTrakeData) {
    const trakeList = kantTrakeData[fileKey]; // Array of objects
    const found = trakeList.find((traka) => traka.sifra === sifra);
    //console.log("found", fileKey, kantTrakeData[0]);

    if (found) {
      console.log(`Found MatName: ${found.matName} for Sifra: ${sifra}`);
      return found.matName;
    }
  }

  console.log(`No MatName found for Sifra: ${sifra}`);
  return null;
} */
// Helper: Parse the Kant Trake file for a given search value
function parseKantTrakeFile(filePath, searchValue) {
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const regex = new RegExp(`Naziv="ABS ${searchValue} mm[^"]*"`);
    const match = fileContent.match(regex);
    return match ? match[0] : null;
  } catch (error) {
    return null;
  }
}

// Helper: Save the XML content as an .S3D file
function saveAsS3DFile(xml, fileName) {
  const outputDir = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const filePath = path.join(outputDir, `${fileName}.S3D`);
  const normalizedXml = normalizeC6DatAttributeLineBreaks(xml);
  // Replace LF with CRLF and add BOM for UTF-8
  const xmlWithCRLF = normalizedXml.replace(/\n/g, "\r\n");
  const utf8Bom = Buffer.from([0xef, 0xbb, 0xbf]);
  const xmlBuffer = Buffer.from(xmlWithCRLF, "utf8");
  const outputBuffer = Buffer.concat([utf8Bom, xmlBuffer]);

  fs.writeFileSync(filePath, outputBuffer);
  return filePath;
}

module.exports = { convertDaskeValueToS3D };
