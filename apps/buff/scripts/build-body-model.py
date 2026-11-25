"""
Builds public/models/body.glb (the rigged human used by the /form pages) from
Quaternius' "Universal Base Characters [Standard]" pack (CC0 1.0).

  1. Download the free pack: https://quaternius.itch.io/universal-base-characters
  2. Unzip it somewhere, then run:

     blender --background --factory-startup \
       --python apps/buff/scripts/build-body-model.py -- \
       "/path/to/Universal Base Characters[Standard]" apps/buff/public/models/body.glb

What it does: imports the male base body (UE-mannequin style skeleton), parents
the "Simple Parted" hairstyle to the head bone, downsizes the textures and
exports a single, compact GLB.
"""

import os
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1 :]
pack, out = argv[0], os.path.abspath(argv[1])
body_gltf = os.path.join(pack, "Base Characters", "Godot - UE", "Superhero_Male_FullBody.gltf")
hair_gltf = os.path.join(pack, "Hairstyles", "Origin at 0", "glTF (Godot)", "Hair_SimpleParted.gltf")

bpy.ops.wm.read_factory_settings(use_empty=True)

bpy.ops.import_scene.gltf(filepath=body_gltf)
armature = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")

before = set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=hair_gltf)
hair_objects = [o for o in bpy.context.scene.objects if o not in before and o.type == "MESH"]

# Parent the hair to the head bone, keeping its world transform.
for hair in hair_objects:
    world = hair.matrix_world.copy()
    hair.parent = armature
    hair.parent_type = "BONE"
    hair.parent_bone = "Head"
    hair.matrix_world = world
    hair.name = "Hair"

# Drop empties the hair import may have created.
for o in list(bpy.context.scene.objects):
    if o.type == "EMPTY" and not o.children:
        bpy.data.objects.remove(o)

# A few .gltf files in the pack point at normal maps that aren't in the zip
# (e.g. "T_Eye_Normal_png.png"); drop those texture nodes so the GLB stays valid.
for mat in bpy.data.materials:
    if not mat.use_nodes:
        continue
    for node in list(mat.node_tree.nodes):
        if node.type == "TEX_IMAGE" and (node.image is None or node.image.size[0] == 0):
            mat.node_tree.nodes.remove(node)

# Downsize textures: colour 1024px, everything else 512px.
for image in bpy.data.images:
    if image.size[0] == 0:
        continue
    target = 1024 if "Normal" not in image.name and "Roughness" not in image.name else 512
    if image.size[0] > target:
        image.scale(target, target)

os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=out,
    export_format="GLB",
    export_image_format="WEBP",
    export_animations=False,
    export_apply=False,
    export_yup=True,
)
print("wrote", out)
