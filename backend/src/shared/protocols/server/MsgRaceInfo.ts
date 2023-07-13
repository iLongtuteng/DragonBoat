import { NameObj, TeamObj } from "../../../game/Models/Race";

export interface MsgRaceInfo {
    difficulty: number,
    winDis: number,
    teamObjArr: TeamObj[],
    nameObjArr: NameObj[]
}
