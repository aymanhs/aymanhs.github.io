import os
import shutil
import glob

from markdown2 import markdown
from jinja2 import Environment, FileSystemLoader

env = Environment(loader=FileSystemLoader("./templates"))


def read_md(fn):
    print("Reading md file", fn)
    with open(fn, "r") as file:
        parsed_md = markdown(
            file.read(), extras=["metadata", "fenced-code-blocks", "tables"]
        )
        pmd = {"content": parsed_md}
        pmd.update(parsed_md.metadata)
        return pmd


def write_html(fn, template, **kwargs):
    tplt = env.get_template(template)
    with open(fn, "w") as out:
        out.write(tplt.render(**kwargs))


if __name__ == "__main__":

    # delete the output
    try:
        shutil.rmtree("posts")
        os.remove("index.html")
    except IOError:
        pass

    os.mkdir("posts")

    posts = {}

    for f in glob.iglob("content\\posts\\*.md"):
        posts[f] = read_md(f)

    for f, post in posts.items():
        # print("\n\nMaking:", post)
        if "slug" in post:
            fn = f"posts\\{post['slug']}.html"
        else:
            fn = f.replace("content\\", "post\\").replace(".md", ".html")
        write_html(fn, "post.html", post=post)
    # make the index of the pages
    write_html("index.html", "index.html", posts=posts)
