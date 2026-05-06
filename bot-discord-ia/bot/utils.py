import os
import glob

def list_class_topics(data_dir: str = '../data'):
    """List all available class topics (filenames without extension)."""
    files = glob.glob(os.path.join(data_dir, '*.md'))
    return [os.path.splitext(os.path.basename(f))[0] for f in files]


def load_class_content(topic: str, data_dir: str = '../data'):
    """Load the content of a class topic."""
    path = os.path.join(data_dir, f'{topic.lower()}.md')
    if not os.path.exists(path):
        return None
    with open(path, 'r') as f:
        return f.read()


def save_class_content(topic: str, content: str, data_dir: str = '../data'):
    """Save or update the content of a class topic."""
    path = os.path.join(data_dir, f'{topic.lower()}.md')
    with open(path, 'w') as f:
        f.write(content)
