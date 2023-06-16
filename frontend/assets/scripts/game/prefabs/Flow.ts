import { _decorator, Component, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Flow')
export class Flow extends Component {

    public speed: number = 0;
    private _boat: Node = null;

    public setBoat(boat: Node) {
        if (this._boat) {
            let range = boat.position.x - this._boat.position.x;
            this.node.position = new Vec3(this.node.position.x + range, this.node.position.y, this.node.position.z);
        }

        this._boat = boat;
    }

    update(deltaTime: number) {
        if (this._boat && this._boat.position.x - this.node.position.x > 2000) {
            this.node.position = new Vec3(this.node.position.x - this.speed * deltaTime + 1000, this.node.position.y, this.node.position.z);
        } else {
            this.node.position = new Vec3(this.node.position.x - this.speed * deltaTime, this.node.position.y, this.node.position.z);
        }
    }
}

