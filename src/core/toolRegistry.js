const tools = new Map();

function register(tool) {
  if (!tool || !tool.id) {
    throw new Error('Tool plugin is missing a required "id" field');
  }
  if (tools.has(tool.id)) {
    console.warn(`[toolRegistry] Tool id "${tool.id}" registered twice — overwriting`);
  }
  tools.set(tool.id, tool);
}

function list() {
  return Array.from(tools.values()).map(({ id, name, description, category, icon, stub }) => ({
    id, name, description, category, icon, stub: !!stub
  }));
}

async function run(toolId, args, ctx) {
  const tool = tools.get(toolId);
  if (!tool) return { ok: false, error: `Unknown tool: ${toolId}` };
  if (tool.stub) return { ok: false, error: `"${tool.name}" is not implemented yet.` };
  try {
    const data = await tool.run(args || {}, ctx || {});
    return { ok: true, data };
  } catch (err) {
    console.error(`[toolRegistry] Tool "${toolId}" threw:`, err);
    return { ok: false, error: err.message || String(err) };
  }
}

module.exports = { register, list, run };
