import {
  buildTerrainChunkGeometry,
  terrainChunkGeometryTransferList,
  type TerrainChunkWorkerRequest,
  type TerrainChunkWorkerResponse,
} from "./terrainPrimitives"

type TerrainWorkerScope = Readonly<{
  postMessage: (
    message: TerrainChunkWorkerResponse,
    transfer: Transferable[],
  ) => void
}> & {
  onmessage: ((event: MessageEvent<TerrainChunkWorkerRequest>) => void) | null
}

const workerScope = self as unknown as TerrainWorkerScope

workerScope.onmessage = event => {
  const request = event.data
  if (request.subject !== "build_terrain_chunk") {
    return
  }

  const data = buildTerrainChunkGeometry(request.options)
  workerScope.postMessage(
    {
      subject: "terrain_chunk_built",
      id: request.id,
      data,
    },
    terrainChunkGeometryTransferList(data),
  )
}
