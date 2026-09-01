# Third-party notices

FinPath 的 CSV 导出安全处理参考并适配自 Actual Budget 的公式注入防护逻辑。

## Actual Budget

- Repository: https://github.com/actualbudget/actual
- Adapted concept: CSV string formula-trigger neutralization in `lib/finance/csv.ts`
- License: MIT
- Copyright: James Long and Actual Budget contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Design references without copied source

The budgeting and transaction interaction model was informed by Kebo
(Apache-2.0). Financial reporting ideas were reviewed from Fava (MIT). No source
from those projects was copied into this release.

AGPL projects were used only for product research. No AGPL-licensed source code
is included in this release.
