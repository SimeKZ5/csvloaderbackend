const fs = require("fs");

function normalizeMatName(name) {
  if (!name) return "";
  const match = name
    .toLowerCase()
    .match(/(?:abs|mm)?\s*[_\-]?\s*(\d+(\.\d+)?)/);
  return match?.[1] || "";
}

function findClosestKantTraka(kantTrakeData, searchValue) {
  if (!searchValue || !kantTrakeData) return null;

  const normalizedSearch = normalizeMatName(`ABS ${searchValue} mm`);
  for (const [group, trakeList] of Object.entries(kantTrakeData)) {
    for (const traka of trakeList) {
      const norm = normalizeMatName(traka.group);
      if (norm === normalizedSearch) {
        return { group, original: traka.group };
      }
    }
  }

  return null;
}

function findMatNameForSifra(kantTrakeData, sifra) {
  if (!sifra || !kantTrakeData) return null;
  for (const fileKey in kantTrakeData) {
    const trakeList = kantTrakeData[fileKey];
    const found = trakeList.find((traka) => traka.sifra === sifra);
    if (found) return found.matName;
  }
  return null;
}

function findSifraFromMaterialIfUnchecked(
  kantTrakeData,
  groupGuess,
  materialName
) {
  if (groupGuess && kantTrakeData[groupGuess]) {
    const match = kantTrakeData[groupGuess].find(
      (traka) =>
        traka.matName?.trim().toLowerCase() ===
        materialName?.trim().toLowerCase()
    );
    if (match) return match.matName;
  }

  for (const [group, trakeList] of Object.entries(kantTrakeData)) {
    const match = trakeList.find(
      (traka) =>
        traka.matName?.trim().toLowerCase() ===
        materialName?.trim().toLowerCase()
    );
    if (match) return match.matName;
  }

  return null;
}

module.exports = {
  normalizeMatName,
  findClosestKantTraka,
  findMatNameForSifra,
  findSifraFromMaterialIfUnchecked,
};
