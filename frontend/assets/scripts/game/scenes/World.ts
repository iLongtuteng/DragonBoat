import { _decorator, Component, instantiate, Label, Node, Prefab, Vec3 } from 'cc';
import { gameManager } from '../GameManager';
import { gameConfig } from '../../shared/game/GameConfig';
import { Flow } from '../prefabs/Flow';
const { ccclass, property } = _decorator;

@ccclass('World')
export class World extends Component {

    @property(Prefab)
    signPrefab: Prefab;

    @property(Node)
    signs: Node;

    @property(Prefab)
    flowPrefab: Prefab;

    private _flowArr: Node[] = [];

    onLoad() {
        let xOffset = 640;
        do {
            let sign = instantiate(this.signPrefab);
            sign.position = new Vec3(xOffset, 500, 0);
            let distance = gameManager.winDis * gameConfig.disUnit - (xOffset - 640);
            if (distance == 0) {
                sign.getChildByName('Label').getComponent(Label).string = 'FINISH!';
            } else {
                sign.getChildByName('Label').getComponent(Label).string = distance / 100 + 'm';
            }
            sign.parent = this.signs;
            xOffset += gameConfig.disUnit;
        } while (xOffset <= gameManager.winDis * gameConfig.disUnit + 640);
    }

    public addFlow(cb: Function): void {
        for (let i = 0; i < 12; i++) {
            let flow = instantiate(this.flowPrefab);
            flow.parent = this.node;
            flow.position = new Vec3(-360 + Math.random() * 100, 440 - i * 40, 0);
            if (i % 2) {
                flow.getComponent(Flow).speed = 1 + Math.random() * 5;
            } else {
                flow.getComponent(Flow).speed = 11 + Math.random() * 15;
            }
            this._flowArr.push(flow);
        }

        cb && cb();
    }

    public addBoat(boat: Node, index: number): void {
        boat.parent = this.node;
        boat.position = new Vec3(640, 425 - index * 80, 0);
        boat.setSiblingIndex(2 + index * 3);
    }

    public setBoat(boat: Node): void {
        for (let flow of this._flowArr) {
            flow.getComponent(Flow).setBoat(boat);
        }
    }
}

