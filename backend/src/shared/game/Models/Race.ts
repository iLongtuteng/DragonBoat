import { WsConnection } from "tsrpc";
import { gameConfig } from "../GameConfig";
import { ServiceType } from "../../protocols/serviceProto";
import { GameSystem, GameSystemInput } from "../GameSystem";

export interface RaceType {
    id: number,
    name: string,
    teamArr: number[]
}

export class Race implements RaceType {

    id: number = 0;
    name: string = '';
    teamArr: number[] = [];

    // key：竞赛的团队索引；value：每个团队成员的连接
    teamMap: Map<number, WsConnection<ServiceType>[]> = new Map<number, WsConnection<ServiceType>[]>();
    difficulty: number = 1;
    winDis: number = 40;
    isStart: boolean = false;
    creatorId: number = 0;
    gameSystem!: GameSystem;
    pendingInputs: GameSystemInput[];
    conns: WsConnection<ServiceType>[] = [];
    interval!: NodeJS.Timeout;

    constructor(id: number, name: string, teamArr: number[], difficulty: number, creatorId: number) {
        this.id = id;
        this.name = name;
        this.teamArr = teamArr;
        this.difficulty = difficulty;

        switch (difficulty) {
            case 0:
                this.winDis = 20;
                break;

            case 1:
                this.winDis = 40;
                break;

            case 2:
                this.winDis = 60;
                break;

            default:
                this.winDis = 20;
                break;
        }

        this.creatorId = creatorId;
        this.pendingInputs = [];

        teamArr.forEach(element => {
            this.teamMap.set(element, []);
        });
    }

    public addPlayer(conn: WsConnection<ServiceType>, teamIdx: number): boolean {
        if (this.teamMap.has(teamIdx)) {
            let index = this.teamMap.get(teamIdx)?.indexOf(conn);
            if (index !== undefined && index < 0 && this.teamMap.get(teamIdx)?.length! < gameConfig.maxMember) {
                this.teamMap.get(teamIdx)?.push(conn);
                this.conns.push(conn);
                conn.listenMsg('client/ClientInput', call => {
                    call.msg.inputs.forEach(v => {
                        this.applyInput({
                            ...v,
                            playerId: conn.playerId!
                        });
                    });
                });

                return true;
            }
        }

        return false;
    }

    applyInput(input: GameSystemInput) {
        // if (input.type == 'PlayerHeart') {
        //     console.log(input.playerId, input.heartState);
        // }
        this.pendingInputs.push(input);
    }

    public removePlayer(conn: WsConnection<ServiceType>): void {
        for (let value of this.teamMap.values()) {
            let index = value.indexOf(conn);
            if (index >= 0) {
                value.splice(index, 1);
            }
        }

        let index = this.conns.indexOf(conn);
        if (index >= 0) {
            this.conns.splice(index, 1);
        }
    }

    public startRace(): void {
        this.removeEmpty();

        let map: Map<number, number[]> = new Map<number, number[]>();
        for (let entry of this.teamMap.entries()) {
            let arr: number[] = [];
            for (let conn of entry[1]) {
                arr.push(conn.playerId!);
            }
            map.set(entry[0], arr);
        }
        this.gameSystem = new GameSystem(this.winDis, map);

        this.interval = setInterval(() => { this.sync() }, 1000 / gameConfig.syncRate);
    }

    sync() {
        let inputs = this.pendingInputs;
        this.pendingInputs = [];

        // Apply inputs
        inputs.forEach(v => {
            this.gameSystem.applyInput(v);
        });

        // 发送同步帧
        this.conns.forEach(v => {
            v.sendMsg('server/Frame', {
                state: this.gameSystem.state
            })
        });
    }

    private removeEmpty() {
        for (let entry of this.teamMap.entries()) {
            if (!entry[1].length) {
                this.teamMap.delete(entry[0]);
                let index = this.teamArr.indexOf(entry[0]);
                if (index >= 0) {
                    this.teamArr.splice(index, 1);
                }
            }
        }
    }
}