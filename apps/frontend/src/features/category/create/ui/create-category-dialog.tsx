'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'

import { CreateCategoryForm } from './create-category-form'

export function CreateCategoryDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus data-icon="inline-start" />
        Добавить
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая категория</DialogTitle>
          <DialogDescription>Для группировки доходов и расходов</DialogDescription>
        </DialogHeader>
        {/* Popup размонтируется при закрытии — форма каждый раз открывается чистой,
            а цвет по умолчанию считается заново по актуальному списку категорий. */}
        <CreateCategoryForm
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
          renderFooter={(actions) => <DialogFooter className="mt-5">{actions}</DialogFooter>}
        />
      </DialogContent>
    </Dialog>
  )
}
