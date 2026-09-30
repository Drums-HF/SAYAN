// Salutation de l'accueil : formule de politesse seule, sans commentaire (§9).

/** « Bonsoir » de 18 h 00 à 03 h 59 (le repas du soir et sa saisie tardive, §7.2), « Bonjour » sinon. */
export function salutation(maintenant = new Date()): string {
  const heure = maintenant.getHours()
  return heure >= 18 || heure < 4 ? 'Bonsoir' : 'Bonjour'
}
