import os
import shutil
import glob

from markdown2 import markdown
from jinja2 import Environment, FileSystemLoader

env = Environment(loader=FileSystemLoader("./templates"))


def make_index(pages):
    print("Generating index", pages)
    tplt = env.get_template("index.html")
    with open("index.html", "w") as genfile:
        genfile.write(tplt.render(pages=pages))

def handle_md(fn):
    print("Generating md file", fn)
    with open(fn, "r") as file:
        parsed_md = markdown(
            file.read(), extras=["metadata", "fenced-code-blocks", "tables"]
        )

        md = parsed_md.metadata

        tplt = env.get_template("post.html")

        data = {
            "content": parsed_md,
        }

        data.update(md)

        html_file = fn.replace("content\\", "").replace(".md", ".html")

        with open(html_file, "w") as genfile:
            genfile.write(tplt.render(post=data))
        
        return md

if __name__ == '__main__':

    # delete the output
    try:
        shutil.rmtree("posts")
    except IOError:
        pass

    os.mkdir("posts")

    pages = {}

    for f in glob.iglob("content\\posts\\*"):
        if f.endswith(".md"):
            md = open(f).read()
            pages[f] = handle_md(f)
        else:
            print("Processing: ", f)
            
    # make the index of the pages
    make_index(pages)
