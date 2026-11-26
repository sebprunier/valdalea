/**
 * Le strict nécessaire de Node pour les tests qui regardent les fichiers publiés.
 * Le projet n'installe pas les types de Node : ils déborderaient sur le code du jeu,
 * qui ne tourne que dans un navigateur.
 */
declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readdirSync(path: string): string[];
  export function statSync(path: string): { size: number };
}
