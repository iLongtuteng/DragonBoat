import { _decorator, Component, Label, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Rank')
export class Rank extends Component {

    @property(Label)
    label: Label;

    public boat: Node = null;

    update(deltaTime: number) {
        if (!this.boat) return;

        this.node.position = new Vec3(this.boat.position.x + 100, this.boat.position.y + 105, 0);
    }
}

