#!/usr/bin/env python3
"""3D plotter for the Quasi Discord bot.

Reads a JSON job from stdin, writes a PNG to the path in `output`, prints a
one-line JSON result to stdout. User-supplied math expressions are evaluated
through a locked-down AST whitelist (no builtins, no attribute access, no
imports), so this is safe to call with untrusted input.

Job schema:
  {
    "mode": "surface" | "line",
    "output": "/abs/path/out.png",
    "title": "optional title",
    # surface: z = f(x, y)
    "expr": "sin(sqrt(x**2 + y**2))",
    "xrange": [-5, 5], "yrange": [-5, 5], "samples": 80,
    # line: parametric (x(t), y(t), z(t))
    "x": "cos(t)", "y": "sin(t)", "z": "t",
    "trange": [0, 12.566], "points": 600,
    "cmap": "viridis"
  }
"""
import ast
import json
import sys

import matplotlib

matplotlib.use("Agg")  # headless: no display needed
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from mpl_toolkits.mplot3d import Axes3D  # noqa: F401,E402  (registers 3d projection)

# ---------------------------------------------------------------------------
# Safe expression evaluation
# ---------------------------------------------------------------------------

# Whitelisted callables, all vectorized over numpy arrays.
SAFE_FUNCS = {
    name: getattr(np, name)
    for name in (
        "sin", "cos", "tan", "arcsin", "arccos", "arctan", "arctan2",
        "sinh", "cosh", "tanh", "exp", "expm1", "log", "log2", "log10",
        "log1p", "sqrt", "cbrt", "abs", "fabs", "sign", "floor", "ceil",
        "round", "power", "maximum", "minimum", "mod", "hypot", "clip",
        "where", "real", "imag", "angle", "gradient",
    )
}
SAFE_CONSTS = {"pi": np.pi, "e": np.e, "tau": 2 * np.pi, "inf": np.inf}

# AST node types permitted inside a user expression.
_ALLOWED_NODES = (
    ast.Expression, ast.BinOp, ast.UnaryOp, ast.Call, ast.Name, ast.Load,
    ast.Constant, ast.Tuple,
    ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod, ast.Pow,
    ast.USub, ast.UAdd,
)


class ExprError(ValueError):
    pass


def _validate(node, allowed_vars):
    if not isinstance(node, _ALLOWED_NODES):
        raise ExprError(f"disallowed syntax: {type(node).__name__}")
    if isinstance(node, ast.Constant) and not isinstance(node.value, (int, float)):
        raise ExprError("only numeric constants allowed")
    if isinstance(node, ast.Name):
        if node.id not in allowed_vars and node.id not in SAFE_FUNCS and node.id not in SAFE_CONSTS:
            raise ExprError(f"unknown name: {node.id!r}")
    if isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name) or node.func.id not in SAFE_FUNCS:
            raise ExprError("only whitelisted math functions may be called")
        if node.keywords:
            raise ExprError("keyword arguments not allowed")
    for child in ast.iter_child_nodes(node):
        _validate(child, allowed_vars)


def compile_expr(expr, allowed_vars):
    """Parse + validate a math expression; return a callable(**vars)."""
    expr = str(expr).strip()
    if not expr:
        raise ExprError("empty expression")
    if len(expr) > 500:
        raise ExprError("expression too long")
    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError as exc:
        raise ExprError(f"syntax error: {exc.msg}")
    _validate(tree, allowed_vars)
    code = compile(tree, "<expr>", "eval")
    namespace = {"__builtins__": {}, **SAFE_FUNCS, **SAFE_CONSTS}

    def evaluate(**vars_):
        return eval(code, namespace, vars_)  # noqa: S307 - namespace is locked down

    return evaluate


# ---------------------------------------------------------------------------
# Plot helpers
# ---------------------------------------------------------------------------

def _clamp(value, lo, hi, default):
    try:
        value = int(value)
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, value))


def _range(job, key, default):
    rng = job.get(key, default)
    try:
        lo, hi = float(rng[0]), float(rng[1])
    except (TypeError, ValueError, IndexError):
        raise ExprError(f"invalid {key}")
    if not np.isfinite(lo) or not np.isfinite(hi) or lo == hi:
        raise ExprError(f"invalid {key}")
    return (lo, hi) if lo < hi else (hi, lo)


def plot_surface(job, ax):
    f = compile_expr(job.get("expr", ""), {"x", "y"})
    xlo, xhi = _range(job, "xrange", [-5, 5])
    ylo, yhi = _range(job, "yrange", [-5, 5])
    n = _clamp(job.get("samples", 80), 10, 200, 80)
    xs = np.linspace(xlo, xhi, n)
    ys = np.linspace(ylo, yhi, n)
    X, Y = np.meshgrid(xs, ys)
    with np.errstate(all="ignore"):
        Z = f(x=X, y=Y)
    Z = np.asarray(Z, dtype=float) + np.zeros_like(X)  # broadcast scalars
    Z[~np.isfinite(Z)] = np.nan
    cmap = job.get("cmap", "viridis")
    surf = ax.plot_surface(X, Y, Z, cmap=cmap, linewidth=0, antialiased=True)
    ax.set_xlabel("x"); ax.set_ylabel("y"); ax.set_zlabel("z")
    ax.figure.colorbar(surf, ax=ax, shrink=0.5, aspect=12, pad=0.08)
    return job.get("title") or f"z = {job.get('expr')}"


def plot_line(job, ax):
    fx = compile_expr(job.get("x", "cos(t)"), {"t"})
    fy = compile_expr(job.get("y", "sin(t)"), {"t"})
    fz = compile_expr(job.get("z", "t"), {"t"})
    tlo, thi = _range(job, "trange", [0, 2 * np.pi])
    n = _clamp(job.get("points", 600), 20, 5000, 600)
    t = np.linspace(tlo, thi, n)
    with np.errstate(all="ignore"):
        X = fx(t=t) + np.zeros_like(t)
        Y = fy(t=t) + np.zeros_like(t)
        Z = fz(t=t) + np.zeros_like(t)
    ax.plot(X, Y, Z, color="#5865f2", linewidth=2)
    ax.set_xlabel("x"); ax.set_ylabel("y"); ax.set_zlabel("z")
    return job.get("title") or "parametric curve"


def main():
    try:
        job = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        print(json.dumps({"ok": False, "error": f"bad job json: {exc}"}))
        return 1

    output = job.get("output")
    if not output:
        print(json.dumps({"ok": False, "error": "missing output path"}))
        return 1

    mode = job.get("mode", "surface")
    fig = plt.figure(figsize=(8, 6), dpi=130)
    ax = fig.add_subplot(111, projection="3d")
    try:
        if mode == "surface":
            title = plot_surface(job, ax)
        elif mode == "line":
            title = plot_line(job, ax)
        else:
            raise ExprError(f"unknown mode: {mode!r}")
        ax.set_title(title, fontsize=11)
        if "elev" in job or "azim" in job:
            ax.view_init(elev=float(job.get("elev", 30)), azim=float(job.get("azim", -60)))
        fig.tight_layout()
        fig.savefig(output, format="png", bbox_inches="tight")
    except ExprError as exc:
        print(json.dumps({"ok": False, "error": str(exc)}))
        return 2
    except Exception as exc:  # noqa: BLE001 - report any plotting failure cleanly
        print(json.dumps({"ok": False, "error": f"{type(exc).__name__}: {exc}"}))
        return 3
    finally:
        plt.close(fig)

    print(json.dumps({"ok": True, "output": output}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
