declare module jCanvas {
    interface AllDrawingMethodExceptCoordinatesArgs {
        autosave?: boolean;
        bringToFront?: boolean;
        compositing?: string;
        data?: any;
        disableEvents?: boolean;
        dragGroups?: string[];
        draggable?: boolean;
        fillStyle?: string;
        groups?: string[];
        intangible?: number;
        layer?: boolean;
        mask?: boolean;
        miterLimit?: number;
        name?: string;
        opacity?: number;
        scale?: number;
        scaleX?: number;
        scaleY?: number;
        shadowBlur?: number;
        shadowColor?: string;
        shadowStroke?: boolean;
        shadowX?: number;
        shadowY?: number;
        strokeCap?: string;
        strokeDash?: number[];
        strokeDashOffset?: number;
        strokeJoin?: string;
        strokeStyle?: string;
        strokeWidth?: number;
        type?: string;
        visible?: boolean;
    }

    interface AllDrawingMethodArgs extends AllDrawingMethodExceptCoordinatesArgs {
        translate?: number;
        translateX?: number;
        translateY?: number;
        x?: number;
        y?: number;
    }

    interface ClearCanvasArgs extends AllDrawingMethodArgs {
        width?: number;
        height?: number;
        rotate?: number;
    }

    interface RotateCanvasArgs extends AllDrawingMethodArgs {
        rotate?: number;
        inDegrees?: boolean;
    }

    interface ScaleCanvasArgs extends AllDrawingMethodArgs {

    }

    interface TranslateCanvas extends AllDrawingMethodArgs {

    }

    interface SaveCanvasArgs extends AllDrawingMethodArgs {
        count?: number;
    }

    interface RestoreCanvas extends AllDrawingMethodArgs {

    }

    interface DrawRectArgs extends AllDrawingMethodArgs {
        width?: number;
        height?: number;
        cornerRadius?: number;
    }

    interface DrawTextArgs { }

    
}

interface JQuery {
    // Canvas
    clearCanvas(args?: jCanvas.ClearCanvasArgs): JQuery;
    rotateCanvas(args: jCanvas.RotateCanvasArgs): JQuery;
    scaleCanvas(args: jCanvas.ScaleCanvasArgs): JQuery;
    translateCanvas(args: jCanvas.TranslateCanvas): JQuery;
    saveCanvas(args?: jCanvas.SaveCanvasArgs): JQuery;
    //restoreCanvas

    // Drawings
    drawRect(args: jCanvas.DrawRectArgs): JQuery;
}

declare module "jcanvas" {
    export = JQuery;
}