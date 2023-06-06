import { _decorator, Component, Node, UITransform, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraCtrl')
export class CameraCtrl extends Component {

    public boat: Node = null;

    lateUpdate(deltaTime: number) {
        if (!this.boat) return;

        let worldPos = this.boat.getComponent(UITransform).convertToWorldSpaceAR(Vec3.ZERO);
        let nodePos = this.node.parent.getComponent(UITransform).convertToNodeSpaceAR(worldPos);
        this.node.position = new Vec3(nodePos.x, this.node.position.y, this.node.position.z);
        // console.log('camera position: ' + this.node.position);
    }
}

