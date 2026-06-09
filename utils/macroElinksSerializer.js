const zlib = require("node:zlib");

function xmlEscapeAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function xmlUnescapeAttribute(value) {
  return String(value ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function toPayloadScalar(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

function objectToCommaSeparatedPayload(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return "";

  return Object.entries(input)
    .map(([key, value]) => `${key}=${toPayloadScalar(value)}`)
    .join(",");
}

function objectToLineSeparatedPayload(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return "";

  return Object.entries(input)
    .map(([key, value]) => `${key}=${toPayloadScalar(value)}`)
    .join("\n");
}

function normalizeIniLines(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^\[[^\]]+\]$/.test(line));
}

function iniTextToCommaSeparatedPayload(text) {
  return normalizeIniLines(text).join(",");
}

function iniTextToLineSeparatedPayload(text) {
  return normalizeIniLines(text).join("\n");
}

function normalizePayload(input, mode) {
  if (input === null || input === undefined) return "";

  if (typeof input === "string") {
    return mode === "line"
      ? iniTextToLineSeparatedPayload(input)
      : iniTextToCommaSeparatedPayload(input);
  }

  if (Array.isArray(input)) {
    if (mode === "line") {
      return input.map((item) => toPayloadScalar(item)).join("\n");
    }
    return input.map((item) => toPayloadScalar(item)).join(",");
  }

  if (typeof input === "object") {
    return mode === "line"
      ? objectToLineSeparatedPayload(input)
      : objectToCommaSeparatedPayload(input);
  }

  return toPayloadScalar(input);
}

function encodeC6DAT(rawText) {
  const plain = String(rawText ?? "");
  const compressed = zlib.deflateSync(Buffer.from(plain, "utf8"));
  const base64 = compressed.toString("base64");

  if (!base64) return "";

  const chunkSize = 76;
  const chunks = [];
  for (let i = 0; i < base64.length; i += chunkSize) {
    chunks.push(base64.slice(i, i + chunkSize));
  }

  return chunks.map((chunk) => xmlEscapeAttribute(chunk)).join("&#xA;");
}

function decodeC6DAT(encodedValue) {
  const xmlValue = xmlUnescapeAttribute(encodedValue);
  const withLineBreaks = xmlValue.replace(/&#xA;/g, "\n");
  const base64 = withLineBreaks.replace(/\s+/g, "");

  if (!base64) return "";

  const compressed = Buffer.from(base64, "base64");
  return zlib.inflateSync(compressed).toString("utf8");
}

function parseIniSections(rawText) {
  const lines = String(rawText ?? "").split(/\r?\n/);
  const sections = [];
  let current = null;

  const pushLine = (target, line) => {
    if (!target) return;
    target.lines.push(line);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      current = {
        name: sectionMatch[1].trim(),
        lines: [],
      };
      sections.push(current);
      continue;
    }

    pushLine(current, line);
  }

  return sections;
}

function sectionLinesToObject(lines) {
  const output = {};
  for (const line of lines) {
    const separator = line.indexOf("=");
    if (separator === -1) {
      output[line] = "";
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    output[key] = value;
  }
  return output;
}

function findSection(sections, predicate) {
  return sections.find((section) => predicate(section.name.toUpperCase()));
}

function findSections(sections, predicate) {
  return sections.filter((section) => predicate(section.name.toUpperCase()));
}

function buildMacroInputFromCmkText(rawText, options = {}) {
  const sections = parseIniSections(rawText);
  const macroName = options.macroName || "X_CONNECTION_TYPE";

  const varSection = findSection(sections, (name) => name === "VARIJABLE");
  const jointSection = findSection(sections, (name) => name === "JOINT");
  const makro1Section = findSection(sections, (name) => name === "MAKRO1");

  const makVarSection = findSection(
    sections,
    (name) => name === "MAK_VARIJABLE" || name === "MAKRO_VARIJABLE" || name === "MSVA"
  );
  const makFoSection = findSection(
    sections,
    (name) =>
      name === "MAK_FORMULE" ||
      name === "MAKRO_FORMULE" ||
      name === "FORMULE" ||
      name === "MSFO"
  );
  const makJoSection = findSection(
    sections,
    (name) => name === "MAK_JOINT" || name === "MAKRO_JOINT" || name === "MAK_MSJO"
  );

  const msraSections = findSections(
    sections,
    (name) => name.startsWith("RASTER") || name.startsWith("MSRA")
  );
  const mspoSections = findSections(
    sections,
    (name) => name.startsWith("MSPO") || name.startsWith("SPOJ") || name.startsWith("PART")
  );

  const mm1Msva = varSection ? sectionLinesToObject(varSection.lines) : {};
  const mm1Msjo = jointSection ? sectionLinesToObject(jointSection.lines) : {};
  const mm1Msma = makro1Section ? sectionLinesToObject(makro1Section.lines) : {};

  const mak = {
    msva: makVarSection ? sectionLinesToObject(makVarSection.lines) : "",
    msfo: makFoSection ? sectionLinesToObject(makFoSection.lines) : "",
    msjo: makJoSection ? sectionLinesToObject(makJoSection.lines) : "",
    msra: msraSections.map((section) => sectionLinesToObject(section.lines)),
    mspo: mspoSections.map((section) => sectionLinesToObject(section.lines)),
  };

  return {
    maklink: {
      ob1: 0,
      ob2: -1,
      csp: 0,
    },
    mm1: {
      mn: macroName || "X_CONNECTION_TYPE",
      msva: mm1Msva,
      msjo: mm1Msjo,
      msma: mm1Msma,
      mak,
    },
    mm2: {
      mn: "",
      msva: "",
    },
  };
}

function buildMM1MSVA(input) {
  const payload = normalizePayload(input, "comma");
  return {
    C6DAT: encodeC6DAT(payload),
    decoded: payload,
  };
}

function buildMM1MSJO(input) {
  const payload = normalizePayload(input, "line");
  return {
    C6DAT: encodeC6DAT(payload),
    decoded: payload,
  };
}

function buildNestedMakChildNodes(makInput) {
  const mak = makInput || {};
  const nodes = {
    MSVA: null,
    MSFO: null,
    MSJO: null,
    MSRA: [],
    MSPO: [],
  };

  const msvaPayload = normalizePayload(mak.msva, "comma");
  const msfoPayload = normalizePayload(mak.msfo, "comma");
  const msjoPayload = normalizePayload(mak.msjo, "line");

  nodes.MSVA = { C6DAT: encodeC6DAT(msvaPayload), decoded: msvaPayload };
  nodes.MSFO = { C6DAT: encodeC6DAT(msfoPayload), decoded: msfoPayload };
  nodes.MSJO = { C6DAT: encodeC6DAT(msjoPayload), decoded: msjoPayload };

  const msraItems = Array.isArray(mak.msra) ? mak.msra : mak.msra ? [mak.msra] : [];
  const mspoItems = Array.isArray(mak.mspo) ? mak.mspo : mak.mspo ? [mak.mspo] : [];

  nodes.MSRA = msraItems.map((item) => {
    const payload = normalizePayload(item, "comma");
    return { C6DAT: encodeC6DAT(payload), decoded: payload };
  });

  nodes.MSPO = mspoItems.map((item) => {
    const payload = normalizePayload(item, "comma");
    return { C6DAT: encodeC6DAT(payload), decoded: payload };
  });

  return nodes;
}

function buildMM1MSMA(input, makInput) {
  const payload = normalizePayload(input, "comma");
  return {
    DAT: xmlEscapeAttribute(payload),
    decoded: payload,
    MAK: buildNestedMakChildNodes(makInput),
  };
}

function buildELINKSDescriptor(input) {
  const source = input || {};

  const mm1 = source.mm1 || {};
  const mm2 = source.mm2 || {};
  const maklink = source.maklink || {};

  return {
    ELINKS: {
      COUNT: "1",
      MAKLINK: {
        OB1: String(maklink.ob1 ?? 0),
        OB2: String(maklink.ob2 ?? -1),
        CSP: String(maklink.csp ?? 0),
        MM1: {
          MN: xmlEscapeAttribute(mm1.mn || "X_CONNECTION_TYPE"),
          MSVA: buildMM1MSVA(mm1.msva),
          MSJO: buildMM1MSJO(mm1.msjo),
          MSMA: buildMM1MSMA(mm1.msma, mm1.mak),
        },
        MM2: {
          MN: xmlEscapeAttribute(mm2.mn || ""),
          MSVA: buildMM1MSVA(mm2.msva),
        },
      },
    },
  };
}

function buildELINKSDocument(input) {
  const descriptor = buildELINKSDescriptor(input);
  const mm1 = descriptor.ELINKS.MAKLINK.MM1;
  const mm2 = descriptor.ELINKS.MAKLINK.MM2;
  const mak = mm1.MSMA.MAK;

  const msraXml = mak.MSRA.map((item) => `<MSRA C6DAT="${item.C6DAT}"/>`).join("");
  const mspoXml = mak.MSPO.map((item) => `<MSPO C6DAT="${item.C6DAT}"/>`).join("");

  return [
    `<ELINKS COUNT="${descriptor.ELINKS.COUNT}">`,
    `<MAKLINK OB1="${descriptor.ELINKS.MAKLINK.OB1}" OB2="${descriptor.ELINKS.MAKLINK.OB2}" CSP="${descriptor.ELINKS.MAKLINK.CSP}">`,
    `<MM1 MN="${mm1.MN}">`,
    `<MSVA C6DAT="${mm1.MSVA.C6DAT}"/>`,
    `<MSJO C6DAT="${mm1.MSJO.C6DAT}"/>`,
    `<MSMA DAT="${mm1.MSMA.DAT}">`,
    `<MAK>`,
    `<MSVA C6DAT="${mak.MSVA.C6DAT}"/>`,
    `<MSFO C6DAT="${mak.MSFO.C6DAT}"/>`,
    `<MSJO C6DAT="${mak.MSJO.C6DAT}"/>`,
    msraXml,
    mspoXml,
    `</MAK>`,
    `</MSMA>`,
    `</MM1>`,
    `<MM2 MN="${mm2.MN}">`,
    `<MSVA C6DAT="${mm2.MSVA.C6DAT}"/>`,
    `</MM2>`,
    `</MAKLINK>`,
    `</ELINKS>`,
  ].join("");
}

module.exports = {
  xmlEscapeAttribute,
  xmlUnescapeAttribute,
  encodeC6DAT,
  decodeC6DAT,
  objectToCommaSeparatedPayload,
  objectToLineSeparatedPayload,
  iniTextToCommaSeparatedPayload,
  iniTextToLineSeparatedPayload,
  parseIniSections,
  buildMacroInputFromCmkText,
  buildMM1MSVA,
  buildMM1MSJO,
  buildMM1MSMA,
  buildNestedMakChildNodes,
  buildELINKSDescriptor,
  buildELINKSDocument,
};
