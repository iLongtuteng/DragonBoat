import { _decorator, Component, instantiate, Node, Prefab, Vec3 } from 'cc';
import { Flow } from '../resources/prefabs/Flow';
import { gameManager } from '../scripts/game/GameManager';
import { gameConfig } from '../scripts/shared/game/GameConfig';
const { ccclass, property } = _decorator;

@ccclass('World')
export class World extends Component {

    @property(Prefab)
    flowPrefab: Prefab;

    @property(Node)
    startNode: Node;

    @property(Node)
    finishNode: Node;

    private _flowArr: Node[] = [];

    onLoad() {
        this.startNode.position = new Vec3(640, 540, 0);
        this.finishNode.position = new Vec3(640 + gameManager.winDis * gameConfig.disUnit, 540, 0);

        for (let i = 0; i < 12; i++) {
            let flow = instantiate(this.flowPrefab);
            flow.parent = this.node;
            flow.position = new Vec3(140 + Math.random() * 100, 440 - i * 40, 0);
            if (i % 2) {
                flow.getComponent(Flow).speed = 1 + Math.random() * 5;
            } else {
                flow.getComponent(Flow).speed = 11 + Math.random() * 15;
            }
            this._flowArr.push(flow);
        }
    }

    public addBoat(boat: Node, index: number, isSelf: boolean): void {
        boat.parent = this.node;
        boat.position = new Vec3(640, 400 - index * 80, 0);
        boat.setSiblingIndex(4 + index * 3);

        if (isSelf) {
            for (let flow of this._flowArr) {
                flow.getComponent(Flow).boat = boat;
            }
        }
    }
}

