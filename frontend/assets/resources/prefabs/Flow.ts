import { _decorator, Component, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Flow')
export class Flow extends Component {

    public boat: Node = null;
    public speed: number = 0;

    update(deltaTime: number) {
        if (this.boat && this.boat.position.x - this.node.position.x > 1500) {
            this.node.position = new Vec3(this.node.position.x - this.speed * deltaTime + 1000, this.node.position.y, this.node.position.z);
        } else {
            this.node.position = new Vec3(this.node.position.x - this.speed * deltaTime, this.node.position.y, this.node.position.z);
        }
    }
}

