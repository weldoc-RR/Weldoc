// Type partagé pour une passe de WPS/DMOS, entre le formulaire de création
// (ajouter-wps.tsx) et l'affichage (page.tsx).
export interface PasseWpsFormulaire {
  ordre: number;
  procede: string;
  modeOperatoire: string;
  position: string;
  metalApportType: string;
  metalApportDesignationNormalisee: string;
  metalApportDesignationCommerciale: string;
  metalApportDiametreMm: string;
  gazEndroitNature: string;
  gazEndroitDebit: string;
  gazEnversNature: string;
  gazEnversDebit: string;
  natureCourantPolarite: string;
  intensiteAMin: string;
  intensiteAMax: string;
  tensionVMin: string;
  tensionVMax: string;
  temperatureMiniPieceC: string;
  temperatureMaxiEntrePassesC: string;
  observations: string;
}

export function passeVide(ordre: number): PasseWpsFormulaire {
  return {
    ordre,
    procede: "",
    modeOperatoire: "",
    position: "",
    metalApportType: "",
    metalApportDesignationNormalisee: "",
    metalApportDesignationCommerciale: "",
    metalApportDiametreMm: "",
    gazEndroitNature: "",
    gazEndroitDebit: "",
    gazEnversNature: "",
    gazEnversDebit: "",
    natureCourantPolarite: "",
    intensiteAMin: "",
    intensiteAMax: "",
    tensionVMin: "",
    tensionVMax: "",
    temperatureMiniPieceC: "",
    temperatureMaxiEntrePassesC: "",
    observations: "",
  };
}

export function passeVersJson(p: PasseWpsFormulaire) {
  return {
    ordre: p.ordre,
    procede: p.procede,
    modeOperatoire: p.modeOperatoire || undefined,
    position: p.position || undefined,
    metalApportType: p.metalApportType || undefined,
    metalApportDesignationNormalisee: p.metalApportDesignationNormalisee || undefined,
    metalApportDesignationCommerciale: p.metalApportDesignationCommerciale || undefined,
    metalApportDiametreMm: p.metalApportDiametreMm ? Number(p.metalApportDiametreMm) : undefined,
    gazEndroitNature: p.gazEndroitNature || undefined,
    gazEndroitDebit: p.gazEndroitDebit || undefined,
    gazEnversNature: p.gazEnversNature || undefined,
    gazEnversDebit: p.gazEnversDebit || undefined,
    natureCourantPolarite: p.natureCourantPolarite || undefined,
    intensiteAMin: p.intensiteAMin ? Number(p.intensiteAMin) : undefined,
    intensiteAMax: p.intensiteAMax ? Number(p.intensiteAMax) : undefined,
    tensionVMin: p.tensionVMin ? Number(p.tensionVMin) : undefined,
    tensionVMax: p.tensionVMax ? Number(p.tensionVMax) : undefined,
    temperatureMiniPieceC: p.temperatureMiniPieceC ? Number(p.temperatureMiniPieceC) : undefined,
    temperatureMaxiEntrePassesC: p.temperatureMaxiEntrePassesC ? Number(p.temperatureMaxiEntrePassesC) : undefined,
    observations: p.observations || undefined,
  };
}
