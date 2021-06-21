import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import when from "../ThirdParty/when.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import defined from "../Core/defined.js";
import Matrix4 from "../Core/Matrix4.js";
import VertexArray from "../Renderer/VertexArray.js";

export default function Model(options) {
  this.drawCommand = undefined;
  this.loader = options.loader;
  this.components = options.loader.components;

  this._readyPromise = when.resolve();
}

Model.prototype.update = function (frameState) {
  if (!defined(this.drawCommand)) {
    this.drawCommand = createCommand(this, frameState);
  }

  frameState.commandList.push(this.drawCommand);
};

function createCommand(model, frameState) {
  var renderState = RenderState.fromCache({
    depthTest: {
      enabled: true,
    },
  });

  // Hard code first primitive
  var primitive = model.components.scene.nodes[0].children[0].primitives[0];
  var positionAttribute = primitive.attributes[1];

  var boundingSphere = BoundingSphere.fromCornerPoints(
    positionAttribute.min,
    positionAttribute.max
  );

  var center = new Cartesian3(
    1215019.2111447915,
    -4736339.477299974,
    4081627.9570209784
  );
  boundingSphere.center = center;
  var modelMatrix = Matrix4.fromTranslation(center);

  var shaderProgram = createShader(frameState.context);

  var vertexArray = createVertexArray(primitive, frameState.context);

  var drawCommand = new DrawCommand({
    boundingVolume: boundingSphere,
    modelMatrix: modelMatrix,
    pass: Pass.OPAQUE,
    shaderProgram: shaderProgram,
    renderState: renderState,
    vertexArray: vertexArray,
    count: primitive.indices.count,
    primitiveType: primitive.primitiveType,
    uniformMap: undefined,
  });

  return drawCommand;
}

function createShader(context) {
  var vertexShader =
    "attribute vec3 a_position;\n" +
    "attribute vec3 a_normal;\n" +
    "varying vec3 v_normal;\n" +
    "void main()\n" +
    "{\n" +
    "    v_normal = a_normal;\n" +
    "    gl_Position = czm_modelViewProjection * vec4(a_position, 1.0);\n" +
    "}\n";

  var fragmentShader =
    "varying vec3 v_normal;\n" +
    "void main()\n" +
    "{\n" +
    "    gl_FragColor = vec4(abs(v_normal), 1.0);\n" +
    "}\n";

  return ShaderProgram.fromCache({
    context: context,
    vertexShaderSource: vertexShader,
    fragmentShaderSource: fragmentShader,
    attributeLocations: {
      a_position: 0,
      a_normal: 1,
    },
  });
}

function createVertexArray(primitive, context) {
  var positionAttribute = {
    index: 0,
    vertexBuffer: primitive.attributes[1].buffer,
    componentsPerAttribute: 3,
    componentDatatype: primitive.attributes[1].componentDatatype,
  };

  var normalAttribute = {
    index: 1,
    vertexBuffer: primitive.attributes[0].buffer,
    componentsPerAttribute: 3,
    componentDatatype: primitive.attributes[0].componentDatatype,
  };

  var vertexArray = new VertexArray({
    context: context,
    attributes: [positionAttribute, normalAttribute],
    indexBuffer: primitive.indices.buffer,
  });

  return vertexArray;
}