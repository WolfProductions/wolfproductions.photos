/* What 'inherit' comes down to below `parentId`, from the flat list of GET /api/folders. */
export function inheritedVisibility(parentId, folders) {
  const byId = new Map(folders.map((folder) => [folder._id, folder]))
  let folder = parentId && byId.get(parentId)
  while (folder) {
    if (folder.visibility && folder.visibility != 'inherit')
      return folder.visibility
    folder = folder.parent && byId.get(folder.parent)
  }
  return 'private'
}

/* The id and every folder id below it, which a folder cannot be moved into. */
export function subtreeIds(id, folders) {
  return new Set([
    id,
    ...folders
      .filter((folder) => folder.ancestors.includes(id))
      .map((folder) => folder._id)
  ])
}

export const VISIBILITY_LABELS = {
  inherit: 'Same as the folder above',
  private: 'Private',
  public: 'Public'
}
