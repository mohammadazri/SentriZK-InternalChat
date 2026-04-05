import subprocess

with open('diff2.txt', 'wb') as f:
    out = subprocess.check_output(['git', 'diff', '--name-only', '9fb9bd97571f7f36051cddc0953a8d626fd9231a'])
    f.write(out)
