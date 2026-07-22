#import "MemoryFootprint.h"

#import <mach/mach.h>

@implementation MemoryFootprint

- (NSNumber *)getMemoryFootprint {
  task_vm_info_data_t info;
  mach_msg_type_number_t count = TASK_VM_INFO_COUNT;
  kern_return_t kr = task_info(mach_task_self(), TASK_VM_INFO,
                               (task_info_t)&info, &count);
  if (kr != KERN_SUCCESS) {
    return @(-1);
  }

  return @(info.phys_footprint);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeMemoryFootprintSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"MemoryFootprint";
}

@end
